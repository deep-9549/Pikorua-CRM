import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { clients, leadCrmDetails, metaLeads } from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'
import { stripPhonePrefix } from '../../common/utils/meta-format'

const SYNC_INTERVAL_MS = 30 * 60 * 1000
const STARTUP_DELAY_MS = 10 * 1000
const BATCH_SIZE = 200

type WebsiteLead = {
  id: string
  created_at: string
  source: string
  name: string
  phone: string
  whatsapp: string | null
  email: string | null
  category: string | null
  location: string | null
  budget_band: string | null
  purpose: string | null
  timeline: string | null
  preferred_callback_time: string | null
  property_ref: string | null
  message: string | null
  status: string
  is_hot: boolean
  crm_synced: boolean
  utm: Record<string, unknown> | null
  consent: boolean
}

const BUDGET_LABELS: Record<string, string> = {
  '1-2cr': '1 Cr – 2 Cr',
  '3-5cr': '3 Cr – 5 Cr',
  '5-10cr': '5 Cr – 10 Cr',
  '10cr-plus': '10 Cr & Above',
  custom: 'Custom',
}

const humanize = (value: string | null) => value
  ? value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : null

@Injectable()
export class WebsiteLeadSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebsiteLeadSyncService.name)
  private interval?: NodeJS.Timeout
  private startupTimer?: NodeJS.Timeout
  private syncing = false

  constructor(private readonly database: DatabaseService) {}

  private get enabled() {
    return String(process.env.WEBSITE_LEAD_SYNC_ENABLED).toLowerCase() === 'true'
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Website lead sync is disabled')
      return
    }

    this.startupTimer = setTimeout(() => void this.sync(), STARTUP_DELAY_MS)
    this.interval = setInterval(() => void this.sync(), SYNC_INTERVAL_MS)
    this.logger.log('Website lead sync enabled (every 30 minutes)')
  }

  onModuleDestroy() {
    if (this.startupTimer) clearTimeout(this.startupTimer)
    if (this.interval) clearInterval(this.interval)
  }

  private headers(prefer?: string) {
    const key = process.env.WEBSITE_SUPABASE_SERVICE_ROLE_KEY!
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    }
  }

  private async fetchUnsynced(): Promise<WebsiteLead[]> {
    const baseUrl = process.env.WEBSITE_SUPABASE_URL!.replace(/\/$/, '')
    const query = new URLSearchParams({
      select: '*',
      crm_synced: 'eq.false',
      order: 'created_at.asc',
      limit: String(BATCH_SIZE),
    })
    const response = await fetch(`${baseUrl}/rest/v1/leads?${query}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`Website Supabase fetch failed (${response.status}): ${await response.text()}`)
    }
    return response.json() as Promise<WebsiteLead[]>
  }

  private async markSynced(ids: string[]) {
    if (ids.length === 0) return
    const baseUrl = process.env.WEBSITE_SUPABASE_URL!.replace(/\/$/, '')
    const idFilter = `in.(${ids.join(',')})`
    const response = await fetch(`${baseUrl}/rest/v1/leads?id=${encodeURIComponent(idFilter)}`, {
      method: 'PATCH',
      headers: this.headers('return=minimal'),
      body: JSON.stringify({ crm_synced: true }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`Website Supabase update failed (${response.status}): ${await response.text()}`)
    }
  }

  private async importLead(sourceLead: WebsiteLead): Promise<boolean> {
    return this.database.db.transaction(async (tx) => {
      const phone = stripPhonePrefix(sourceLead.phone)
      let clientId: string | null = null

      if (phone) {
        const existingClient = await tx.query.clients.findFirst({
          where: eq(clients.phone, phone),
        })

        if (existingClient) {
          clientId = existingClient.id
          if (sourceLead.is_hot && (!existingClient.status || existingClient.status === 'active')) {
            await tx.update(clients).set({
              status: 'hot',
              statusUpdatedAt: new Date(),
              updatedAt: new Date(),
            }).where(eq(clients.id, existingClient.id))
          }
        } else {
          const [insertedClient] = await tx.insert(clients).values({
            tenantId: '00000000-0000-0000-0000-000000000000',
            fullName: sourceLead.name,
            phone,
            email: sourceLead.email,
            status: sourceLead.is_hot ? 'hot' : 'active',
            ...(sourceLead.is_hot ? { statusUpdatedAt: new Date() } : {}),
          }).returning({ id: clients.id })
          clientId = insertedClient.id
        }
      }

      const [inserted] = await tx.insert(metaLeads).values({
        externalId: sourceLead.id,
        fullName: sourceLead.name,
        phone,
        email: sourceLead.email,
        city: humanize(sourceLead.location),
        campaignName: `Website – ${humanize(sourceLead.source) ?? 'Enquiry'}`,
        source: 'website',
        clientId,
        status: 'unassigned',
        receivedAt: new Date(sourceLead.created_at),
        formData: sourceLead,
      }).onConflictDoNothing().returning({ id: metaLeads.id })

      if (!inserted) return false

      const budgetRange = sourceLead.budget_band
        ? (BUDGET_LABELS[sourceLead.budget_band] ?? humanize(sourceLead.budget_band))
        : null
      const remarks = [
        sourceLead.message,
        sourceLead.category ? `Category: ${humanize(sourceLead.category)}` : null,
        sourceLead.purpose ? `Purpose: ${humanize(sourceLead.purpose)}` : null,
        sourceLead.timeline ? `Timeline: ${humanize(sourceLead.timeline)}` : null,
        sourceLead.preferred_callback_time
          ? `Preferred callback: ${sourceLead.preferred_callback_time}`
          : null,
      ].filter(Boolean).join('\n') || null

      if (budgetRange || sourceLead.location || sourceLead.property_ref || remarks) {
        await tx.insert(leadCrmDetails).values({
          leadId: inserted.id,
          budgetRange,
          currentArea: humanize(sourceLead.location),
          projectName: sourceLead.property_ref,
          remarks,
        })
      }

      return true
    })
  }

  async sync() {
    if (!this.enabled || this.syncing) return
    this.syncing = true

    try {
      let imported = 0
      let acknowledged = 0

      // Drain all pending rows in bounded batches. Duplicate CRM rows are
      // acknowledged too, which heals a prior run that inserted successfully
      // but failed before updating crm_synced in the website database.
      while (true) {
        const leads = await this.fetchUnsynced()
        if (leads.length === 0) break

        for (const lead of leads) {
          if (await this.importLead(lead)) imported += 1
        }
        await this.markSynced(leads.map((lead) => lead.id))
        acknowledged += leads.length

        if (leads.length < BATCH_SIZE) break
      }

      this.logger.log(`Website lead sync complete: ${imported} imported, ${acknowledged} acknowledged`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Website lead sync failed: ${message}`)
    } finally {
      this.syncing = false
    }
  }
}
