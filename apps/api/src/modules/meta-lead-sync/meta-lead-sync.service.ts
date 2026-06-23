import { randomUUID } from 'node:crypto'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  integrationSyncLocks,
  metaLeadSyncState,
} from '@pikorua/db'
import { and, eq, lt } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { MetaGraphError, MetaGraphService } from './meta-graph.service'
import { MetaLeadImporterService } from './meta-lead-importer.service'
import { MetaPageConfig, parseMetaPageConfigs } from './meta-page-config'
import {
  META_LEAD_FIELDS,
  MetaLeadData,
  MetaLeadForm,
} from './meta-lead.types'

const LOCK_KEY = 'meta-lead-sync'
const LOCK_DURATION_MS = 4 * 60 * 1000
const FORM_DISCOVERY_INTERVAL_MS = 30 * 60 * 1000
const BACKFILL_MS = 7 * 24 * 60 * 60 * 1000
const OVERLAP_MS = 10 * 60 * 1000
const RUN_BUDGET_MS = 35 * 1000
const GRAPH_TIMEOUT_MS = 6 * 1000
const MIN_REMAINING_MS = 3 * 1000
const PAGE_SIZE = '100'

type SyncState = typeof metaLeadSyncState.$inferSelect

interface FormSyncResult {
  fetched: number
  imported: number
  duplicates: number
  usageHigh: boolean
}

export interface MetaLeadSyncResult {
  ok: boolean
  skipped?: 'disabled' | 'already_running'
  pages_scanned: number
  forms_scanned: number
  leads_fetched: number
  leads_imported: number
  duplicates: number
  failed_forms: Array<{ form_id: string; error: string }>
  started_at: string
  completed_at: string
}

interface MetaLeadSyncOptions {
  pageId?: string
}

class SyncRunHaltedError extends Error {}
class MetaUsageHighError extends SyncRunHaltedError {}

@Injectable()
export class MetaLeadSyncService {
  private readonly logger = new Logger(MetaLeadSyncService.name)

  constructor(
    private readonly database: DatabaseService,
    private readonly graph: MetaGraphService,
    private readonly importer: MetaLeadImporterService,
  ) {}

  private get db() { return this.database.db }

  private assertWithinBudget(deadline: number) {
    if (deadline - Date.now() <= MIN_REMAINING_MS) {
      throw new SyncRunHaltedError('Sync stopped before the serverless execution deadline')
    }
  }

  private graphTimeout(deadline: number) {
    this.assertWithinBudget(deadline)
    return Math.max(
      1_000,
      Math.min(GRAPH_TIMEOUT_MS, deadline - Date.now() - MIN_REMAINING_MS),
    )
  }

  private lockKey(pageId?: string) {
    return pageId ? `${LOCK_KEY}:${pageId}` : LOCK_KEY
  }

  private async acquireLock(ownerId: string, pageId?: string): Promise<boolean> {
    const now = new Date()
    const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS)
    const [lock] = await this.db.insert(integrationSyncLocks).values({
      key: this.lockKey(pageId),
      ownerId,
      lockedUntil,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: integrationSyncLocks.key,
      set: { ownerId, lockedUntil, updatedAt: now },
      setWhere: lt(integrationSyncLocks.lockedUntil, now),
    }).returning({ ownerId: integrationSyncLocks.ownerId })

    return lock?.ownerId === ownerId
  }

  private async releaseLock(ownerId: string, pageId?: string) {
    await this.db.update(integrationSyncLocks)
      .set({ lockedUntil: new Date(), updatedAt: new Date() })
      .where(and(
        eq(integrationSyncLocks.key, this.lockKey(pageId)),
        eq(integrationSyncLocks.ownerId, ownerId),
      ))
  }

  private async discoverForms(page: MetaPageConfig, deadline: number) {
    let after: string | undefined
    const seenAt = new Date()

    do {
      this.assertWithinBudget(deadline)
      const result = await this.graph.getEdgePage<MetaLeadForm>(
        `${encodeURIComponent(page.pageId)}/leadgen_forms`,
        {
          fields: 'id,name,status',
          limit: PAGE_SIZE,
          ...(after ? { after } : {}),
        },
        page.accessToken,
        this.graphTimeout(deadline),
      )

      for (const form of result.data.data ?? []) {
        if (!form.id) continue
        await this.db.insert(metaLeadSyncState).values({
          formId: form.id,
          pageId: page.pageId,
          formName: form.name ?? null,
          status: form.status ?? 'UNKNOWN',
          lastSeenAt: seenAt,
          backfillSince: new Date(seenAt.getTime() - BACKFILL_MS),
          updatedAt: seenAt,
        }).onConflictDoUpdate({
          target: metaLeadSyncState.formId,
          set: {
            pageId: page.pageId,
            formName: form.name ?? null,
            status: form.status ?? 'UNKNOWN',
            lastSeenAt: seenAt,
            updatedAt: seenAt,
          },
        })
      }

      after = result.data.paging?.next
        ? result.data.paging.cursors?.after
        : undefined

      if (result.usageHigh) throw new MetaUsageHighError('Meta usage threshold reached')
    } while (after)
  }

  private shouldDiscover(states: SyncState[]): boolean {
    if (states.length === 0) return true
    const mostRecent = Math.max(...states.map((state) => state.lastSeenAt.getTime()))
    return mostRecent < Date.now() - FORM_DISCOVERY_INTERVAL_MS
  }

  private async updateFormError(formId: string, error: string) {
    await this.db.update(metaLeadSyncState)
      .set({ lastError: error.slice(0, 1_000), updatedAt: new Date() })
      .where(eq(metaLeadSyncState.formId, formId))
  }

  private async syncForm(
    state: SyncState,
    page: MetaPageConfig,
    syncStartedAt: Date,
    deadline: number,
  ): Promise<FormSyncResult> {
    const isBackfill = !state.backfillCompletedAt
    const since = isBackfill
      ? state.backfillSince
      : new Date((state.lastSuccessfulCreatedAt ?? syncStartedAt).getTime() - OVERLAP_MS)
    let after = isBackfill ? state.backfillAfterCursor ?? undefined : undefined
    let supportsFiltering = state.supportsTimeFiltering !== false
    let fetched = 0
    let imported = 0
    let duplicates = 0
    let usageHigh = false

    while (true) {
      this.assertWithinBudget(deadline)
      const params: Record<string, string> = {
        fields: META_LEAD_FIELDS,
        limit: PAGE_SIZE,
        ...(after ? { after } : {}),
      }
      if (supportsFiltering) {
        params.filtering = JSON.stringify([{
          field: 'time_created',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: Math.floor(since.getTime() / 1_000),
        }])
      }

      let result
      try {
        result = await this.graph.getEdgePage<MetaLeadData>(
          `${encodeURIComponent(state.formId)}/leads`,
          params,
          page.accessToken,
          this.graphTimeout(deadline),
        )
      } catch (error) {
        if (
          supportsFiltering &&
          !after &&
          error instanceof MetaGraphError &&
          error.code === 100
        ) {
          supportsFiltering = false
          await this.db.update(metaLeadSyncState)
            .set({ supportsTimeFiltering: false, updatedAt: new Date() })
            .where(eq(metaLeadSyncState.formId, state.formId))
          continue
        }
        throw error
      }

      usageHigh = usageHigh || result.usageHigh

      const pageLeads = result.data.data ?? []
      const relevantLeads = supportsFiltering
        ? pageLeads
        : pageLeads.filter((lead) => {
            const createdAt = lead.created_time ? new Date(lead.created_time) : null
            return !createdAt || Number.isNaN(createdAt.getTime()) || createdAt >= since
          })

      fetched += relevantLeads.length
      for (const lead of relevantLeads) {
        this.assertWithinBudget(deadline)
        if (!lead.id) continue
        const importResult = await this.importer.importLead(lead, {
          pageId: page.pageId,
          pageName: page.pageName,
          formId: state.formId,
        })
        if (importResult === 'imported') imported += 1
        else duplicates += 1
      }

      const nextAfter = result.data.paging?.next
        ? result.data.paging.cursors?.after
        : undefined

      if (isBackfill) {
        await this.db.update(metaLeadSyncState).set({
          backfillAfterCursor: nextAfter ?? null,
          supportsTimeFiltering: supportsFiltering,
          lastError: null,
          updatedAt: new Date(),
        }).where(eq(metaLeadSyncState.formId, state.formId))
      }

      const crossedLocalWatermark = !supportsFiltering && pageLeads.some((lead) => {
        if (!lead.created_time) return false
        const createdAt = new Date(lead.created_time)
        return !Number.isNaN(createdAt.getTime()) && createdAt < since
      })

      if (result.usageHigh && nextAfter) {
        throw new MetaUsageHighError('Meta usage threshold reached')
      }

      if (!nextAfter || crossedLocalWatermark) break
      after = nextAfter
    }

    const completedAt = new Date()
    await this.db.update(metaLeadSyncState).set({
      ...(isBackfill ? {
        backfillAfterCursor: null,
        backfillCompletedAt: completedAt,
      } : {}),
      supportsTimeFiltering: supportsFiltering,
      lastSuccessfulCreatedAt: syncStartedAt,
      lastSuccessfulSyncAt: completedAt,
      lastError: null,
      updatedAt: completedAt,
    }).where(eq(metaLeadSyncState.formId, state.formId))

    return { fetched, imported, duplicates, usageHigh }
  }

  async sync(options: MetaLeadSyncOptions = {}): Promise<MetaLeadSyncResult> {
    const startedAt = new Date()
    const baseResult = {
      pages_scanned: 0,
      forms_scanned: 0,
      leads_fetched: 0,
      leads_imported: 0,
      duplicates: 0,
      failed_forms: [] as Array<{ form_id: string; error: string }>,
      started_at: startedAt.toISOString(),
    }

    if (String(process.env.META_LEAD_SYNC_ENABLED).toLowerCase() !== 'true') {
      return {
        ok: true,
        skipped: 'disabled',
        ...baseResult,
        completed_at: new Date().toISOString(),
      }
    }

    const configuredPages = parseMetaPageConfigs()
    const pages = options.pageId
      ? configuredPages.filter((page) => page.pageId === options.pageId)
      : configuredPages
    if (pages.length === 0) {
      if (options.pageId) {
        throw new NotFoundException(`Meta page ${options.pageId} is not configured in META_PAGES`)
      }
      throw new Error(
        'Meta lead sync is enabled but no pages are configured. Set META_PAGES or META_PAGE_ID/META_PAGE_ACCESS_TOKEN.',
      )
    }

    const ownerId = randomUUID()
    if (!await this.acquireLock(ownerId, options.pageId)) {
      return {
        ok: true,
        skipped: 'already_running',
        ...baseResult,
        completed_at: new Date().toISOString(),
      }
    }

    const deadline = Date.now() + RUN_BUDGET_MS
    let stopForUsage = false

    try {
      for (const page of pages) {
        if (stopForUsage) break
        baseResult.pages_scanned += 1
        let states = await this.db.select().from(metaLeadSyncState)
          .where(eq(metaLeadSyncState.pageId, page.pageId))

        if (this.shouldDiscover(states)) {
          try {
            await this.discoverForms(page, deadline)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            baseResult.failed_forms.push({
              form_id: `__discovery__:${page.pageId}`,
              error: message,
            })
            if (error instanceof MetaUsageHighError) stopForUsage = true
            if (states.length === 0) {
              this.logger.error(`Meta form discovery failed for page ${page.pageId}: ${message}`)
              continue
            }
            this.logger.error(
              `Meta form discovery failed for page ${page.pageId}; using cached forms: ${message}`,
            )
          }

          states = await this.db.select().from(metaLeadSyncState)
            .where(eq(metaLeadSyncState.pageId, page.pageId))
        }

        if (stopForUsage) break

        const eligibleStates = states.filter((state) =>
          !state.backfillCompletedAt || state.status.toUpperCase() === 'ACTIVE',
        )

        for (const state of eligibleStates) {
          if (stopForUsage) break
          baseResult.forms_scanned += 1
          try {
            const result = await this.syncForm(state, page, startedAt, deadline)
            baseResult.leads_fetched += result.fetched
            baseResult.leads_imported += result.imported
            baseResult.duplicates += result.duplicates
            if (result.usageHigh) stopForUsage = true
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            await this.updateFormError(state.formId, message)
            baseResult.failed_forms.push({ form_id: state.formId, error: message })
            this.logger.error(`Meta form ${state.formId} sync failed: ${message}`)
            if (error instanceof MetaUsageHighError || error instanceof SyncRunHaltedError) {
              stopForUsage = error instanceof MetaUsageHighError
              break
            }
          }
        }
      }

      const result: MetaLeadSyncResult = {
        ok: baseResult.failed_forms.length === 0,
        ...baseResult,
        completed_at: new Date().toISOString(),
      }
      this.logger.log(
        `Meta lead sync complete: ${result.leads_imported} imported, ` +
        `${result.duplicates} duplicates, ${result.failed_forms.length} failures`,
      )
      return result
    } finally {
      await this.releaseLock(ownerId, options.pageId).catch((error) => {
        this.logger.error(`Failed to release Meta sync lock: ${String(error)}`)
      })
    }
  }
}
