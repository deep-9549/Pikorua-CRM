import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { clients, leadCrmDetails, metaLeads } from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'
import {
  MicrositeLeadSourceConfig,
  parseMicrositeLeadSourceConfigs,
} from './microsite-lead-source-config'
import { mapMicrositeLeadToCrm } from './microsite-lead.mapper'
import { MicrositeJob, MicrositeLead, MicrositeLeadImportResult } from './microsite-lead.types'
import { poolStatusForClientStatus } from '../leads/lead-pools'

const SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000
const STARTUP_DELAY_MS = 10 * 1000
const BATCH_SIZE = 200
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

@Injectable()
export class MicrositeLeadSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MicrositeLeadSyncService.name)
  private interval?: NodeJS.Timeout
  private startupTimer?: NodeJS.Timeout
  private syncing = false

  constructor(private readonly database: DatabaseService) {}

  private get enabled() {
    return String(process.env.MICROSITE_LEAD_SYNC_ENABLED).toLowerCase() === 'true'
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Microsite lead sync is disabled')
      return
    }

    const sources = parseMicrositeLeadSourceConfigs()
    if (sources.length === 0) {
      this.logger.error('Microsite lead sync is enabled but no sources are configured')
      return
    }

    this.startupTimer = setTimeout(() => void this.sync(), STARTUP_DELAY_MS)
    this.interval = setInterval(() => void this.sync(), SYNC_INTERVAL_MS)
    this.logger.log(`Microsite lead sync enabled (${sources.length} source(s), every 3 hours)`)
  }

  onModuleDestroy() {
    if (this.startupTimer) clearTimeout(this.startupTimer)
    if (this.interval) clearInterval(this.interval)
  }

  private headers(source: MicrositeLeadSourceConfig, prefer?: string) {
    return {
      apikey: source.serviceRoleKey,
      Authorization: `Bearer ${source.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    }
  }

  private async fetchUnsynced(source: MicrositeLeadSourceConfig): Promise<MicrositeLead[]> {
    const query = new URLSearchParams({
      select: '*',
      crm_synced: 'eq.false',
      order: 'created_at.asc',
      limit: String(BATCH_SIZE),
    })
    const response = await fetch(`${source.supabaseUrl}/rest/v1/microsite_leads?${query}`, {
      headers: this.headers(source),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`Microsite Supabase fetch failed (${response.status}): ${await response.text()}`)
    }
    return response.json() as Promise<MicrositeLead[]>
  }

  private postgrestListValue(value: string): string {
    if (/^[a-zA-Z0-9._:-]+$/.test(value)) return value
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }

  private async fetchJobs(
    source: MicrositeLeadSourceConfig,
    jobIds: string[],
  ): Promise<Map<string, MicrositeJob>> {
    const uniqueJobIds = [...new Set(jobIds.filter(Boolean))]
    if (uniqueJobIds.length === 0) return new Map()

    const query = new URLSearchParams({
      select: '*',
      job_id: `in.(${uniqueJobIds.map((id) => this.postgrestListValue(id)).join(',')})`,
    })
    const response = await fetch(`${source.supabaseUrl}/rest/v1/microsite_jobs?${query}`, {
      headers: this.headers(source),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`Microsite Supabase job fetch failed (${response.status}): ${await response.text()}`)
    }

    const jobs = await response.json() as MicrositeJob[]
    return new Map(jobs.map((job) => [job.job_id, job]))
  }

  private async markSynced(source: MicrositeLeadSourceConfig, ids: Array<string | number>) {
    if (ids.length === 0) return
    const idFilter = `in.(${ids.join(',')})`
    const query = new URLSearchParams({ id: idFilter })
    const response = await fetch(`${source.supabaseUrl}/rest/v1/microsite_leads?${query}`, {
      method: 'PATCH',
      headers: this.headers(source, 'return=minimal'),
      body: JSON.stringify({
        crm_synced: true,
        crm_synced_at: new Date().toISOString(),
        crm_sync_error: null,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`Microsite Supabase update failed (${response.status}): ${await response.text()}`)
    }
  }

  private async markError(
    source: MicrositeLeadSourceConfig,
    lead: MicrositeLead,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : String(error)
    const query = new URLSearchParams({ id: `eq.${lead.id}` })
    const response = await fetch(`${source.supabaseUrl}/rest/v1/microsite_leads?${query}`, {
      method: 'PATCH',
      headers: this.headers(source, 'return=minimal'),
      body: JSON.stringify({ crm_sync_error: message.slice(0, 1_000) }),
      signal: AbortSignal.timeout(30_000),
    }).catch((updateError) => {
      this.logger.warn(`Microsite lead ${source.key}:${lead.id} error update failed: ${String(updateError)}`)
      return null
    })

    if (response && !response.ok) {
      this.logger.warn(
        `Microsite lead ${source.key}:${lead.id} error update failed ` +
        `(${response.status})`,
      )
    }
  }

  async importLead(
    source: MicrositeLeadSourceConfig,
    sourceLead: MicrositeLead,
    sourceJob: MicrositeJob | null,
  ): Promise<MicrositeLeadImportResult> {
    const mapped = mapMicrositeLeadToCrm(source, sourceLead, sourceJob)

    return this.database.db.transaction(async (tx) => {
      let clientId: string | null = null
      let pooledStatus: string | null = null

      if (mapped.metaLead.phone) {
        const existingClient = await tx.query.clients.findFirst({
          where: eq(clients.phone, mapped.metaLead.phone),
        })

        if (existingClient) {
          clientId = existingClient.id
          pooledStatus = poolStatusForClientStatus(existingClient.status)
        } else {
          const [insertedClient] = await tx.insert(clients).values({
            tenantId: DEFAULT_TENANT_ID,
            fullName: mapped.metaLead.fullName,
            phone: mapped.metaLead.phone,
            email: mapped.metaLead.email,
            status: 'active',
          }).returning({ id: clients.id })
          clientId = insertedClient.id
        }
      }

      const [inserted] = await tx.insert(metaLeads).values({
        ...mapped.metaLead,
        clientId,
        status: (pooledStatus ?? mapped.metaLead.status) as never,
      }).onConflictDoNothing().returning({ id: metaLeads.id })

      if (!inserted) return 'duplicate'

      const crmDetails = mapped.crmDetails
      if (
        crmDetails.projectName ||
        crmDetails.budgetRange ||
        crmDetails.currentArea ||
        crmDetails.companyName ||
        crmDetails.remarks
      ) {
        await tx.insert(leadCrmDetails).values({
          leadId: inserted.id,
          ...(crmDetails.projectName ? { projectName: crmDetails.projectName } : {}),
          ...(crmDetails.budgetRange ? { budgetRange: crmDetails.budgetRange } : {}),
          ...(crmDetails.currentArea ? { currentArea: crmDetails.currentArea } : {}),
          ...(crmDetails.companyName ? { companyName: crmDetails.companyName } : {}),
          ...(crmDetails.remarks ? { remarks: crmDetails.remarks } : {}),
        }).onConflictDoNothing()
      }

      return 'imported'
    })
  }

  private async syncSource(source: MicrositeLeadSourceConfig) {
    let imported = 0
    let acknowledged = 0

    while (true) {
      const leads = await this.fetchUnsynced(source)
      if (leads.length === 0) break

      const jobs = await this.fetchJobs(
        source,
        leads.map((lead) => lead.job_id).filter(Boolean) as string[],
      )
      const syncedIds: Array<string | number> = []

      for (const lead of leads) {
        try {
          const result = await this.importLead(
            source,
            lead,
            lead.job_id ? jobs.get(lead.job_id) ?? null : null,
          )
          if (result === 'imported') imported += 1
          syncedIds.push(lead.id)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.logger.error(`Microsite lead ${source.key}:${lead.id} import failed: ${message}`)
          await this.markError(source, lead, error)
        }
      }

      await this.markSynced(source, syncedIds)
      acknowledged += syncedIds.length

      if (leads.length < BATCH_SIZE) break
    }

    return { imported, acknowledged }
  }

  async sync() {
    if (!this.enabled || this.syncing) return
    this.syncing = true

    try {
      let imported = 0
      let acknowledged = 0

      for (const source of parseMicrositeLeadSourceConfigs()) {
        try {
          const result = await this.syncSource(source)
          imported += result.imported
          acknowledged += result.acknowledged
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.logger.error(`Microsite source ${source.key} sync failed: ${message}`)
        }
      }

      this.logger.log(`Microsite lead sync complete: ${imported} imported, ${acknowledged} acknowledged`)
    } finally {
      this.syncing = false
    }
  }
}
