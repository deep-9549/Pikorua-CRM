import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { and, asc, eq, inArray, lt, lte, sql } from 'drizzle-orm'
import { metaConversionOutbox, metaLeads } from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'
import { buildMetaCrmEvent, eventForForwardStatusTransition } from './meta-conversion-event'

const STARTUP_DELAY_MS = 10_000
const DISPATCH_INTERVAL_MS = 30_000
const LOCK_TIMEOUT_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 8_000
const BATCH_SIZE = 10
const MAX_ATTEMPTS = 8

type DatabaseTransaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0]

type MetaResponse = {
  events_received?: number
  fbtrace_id?: string
  error?: { message?: string; code?: number; error_subcode?: number }
}

class MetaConversionRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message)
    this.name = 'MetaConversionRequestError'
  }
}

@Injectable()
export class MetaConversionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetaConversionService.name)
  private startupTimer?: NodeJS.Timeout
  private interval?: NodeJS.Timeout
  private dispatching = false

  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }
  private get enabled() { return String(process.env.META_CAPI_ENABLED).toLowerCase() === 'true' }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Meta CRM feedback is disabled')
      return
    }

    this.startupTimer = setTimeout(() => void this.dispatchPending(), STARTUP_DELAY_MS)
    this.interval = setInterval(() => void this.dispatchPending(), DISPATCH_INTERVAL_MS)
    this.startupTimer.unref?.()
    this.interval.unref?.()
    this.logger.log('Meta CRM feedback enabled')
  }

  onModuleDestroy() {
    if (this.startupTimer) clearTimeout(this.startupTimer)
    if (this.interval) clearInterval(this.interval)
  }

  async enqueueStatusTransition(
    tx: DatabaseTransaction,
    input: {
      clientId: string
      originLeadId?: string
      previousStatus?: string | null
      nextStatus?: string | null
      eventTime: Date
    },
  ) {
    if (!this.enabled || !input.originLeadId) return null

    const mapped = eventForForwardStatusTransition(input.previousStatus, input.nextStatus)
    if (!mapped) return null

    const lead = await tx.query.metaLeads.findFirst({
      where: and(
        eq(metaLeads.id, input.originLeadId),
        eq(metaLeads.clientId, input.clientId),
      ),
      columns: { id: true, source: true, externalId: true, deletedAt: true },
    })

    if (!lead || lead.deletedAt || lead.source !== 'meta_ads' || !lead.externalId) return null

    const [created] = await tx.insert(metaConversionOutbox).values({
      leadId: lead.id,
      eventName: mapped.eventName,
      clientStatus: mapped.clientStatus,
      eventTime: input.eventTime,
    }).onConflictDoNothing().returning({ id: metaConversionOutbox.id })

    return created?.id ?? null
  }

  async dispatchPending() {
    if (!this.enabled || this.dispatching) return
    this.dispatching = true

    try {
      const now = new Date()
      const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS)
      await this.db.update(metaConversionOutbox).set({
        status: 'retry',
        lockedAt: null,
        nextAttemptAt: now,
        lastError: 'Recovered after an interrupted delivery attempt',
        updatedAt: now,
      }).where(and(
        eq(metaConversionOutbox.status, 'processing'),
        lt(metaConversionOutbox.lockedAt, staleBefore),
      ))

      const candidates = await this.db.query.metaConversionOutbox.findMany({
        where: and(
          inArray(metaConversionOutbox.status, ['pending', 'retry']),
          lte(metaConversionOutbox.nextAttemptAt, now),
        ),
        orderBy: [asc(metaConversionOutbox.nextAttemptAt)],
        limit: BATCH_SIZE,
      })

      for (const candidate of candidates) await this.deliver(candidate.id)
    } catch (error) {
      this.logger.error(`Meta CRM feedback dispatcher failed: ${this.safeMessage(error)}`)
    } finally {
      this.dispatching = false
    }
  }

  private async deliver(id: string) {
    const now = new Date()
    const [claimed] = await this.db.update(metaConversionOutbox).set({
      status: 'processing',
      lockedAt: now,
      lastAttemptAt: now,
      attempts: sql`${metaConversionOutbox.attempts} + 1`,
      updatedAt: now,
    }).where(and(
      eq(metaConversionOutbox.id, id),
      inArray(metaConversionOutbox.status, ['pending', 'retry']),
    )).returning()

    if (!claimed) return

    try {
      const lead = await this.db.query.metaLeads.findFirst({
        where: eq(metaLeads.id, claimed.leadId),
        columns: { source: true, externalId: true, deletedAt: true },
      })
      if (!lead || lead.deletedAt || lead.source !== 'meta_ads' || !lead.externalId) {
        throw new MetaConversionRequestError('Originating Meta lead is no longer eligible', false)
      }

      const response = await this.send({
        eventId: claimed.id,
        eventName: claimed.eventName,
        eventTime: claimed.eventTime,
        metaLeadId: lead.externalId,
      })

      await this.db.update(metaConversionOutbox).set({
        status: 'delivered',
        deliveredAt: new Date(),
        lockedAt: null,
        lastError: null,
        metaTraceId: response.fbtrace_id ?? null,
        updatedAt: new Date(),
      }).where(eq(metaConversionOutbox.id, claimed.id))
      this.logger.log(`Delivered Meta CRM event ${claimed.eventName} for outbox ${claimed.id}`)
    } catch (error) {
      await this.recordFailure(claimed, error)
    }
  }

  private async send(input: { eventId: string; eventName: string; eventTime: Date; metaLeadId: string }) {
    const version = process.env.META_CAPI_API_VERSION!
    const datasetId = process.env.META_CAPI_DATASET_ID!
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN!
    const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim()
    const body = {
      data: [buildMetaCrmEvent(input)],
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    }

    let response: Response
    try {
      response = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(datasetId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      )
    } catch (error) {
      throw new MetaConversionRequestError(`Meta request failed: ${this.safeMessage(error)}`, true)
    }

    const result = await response.json().catch(() => ({})) as MetaResponse
    if (!response.ok || result.events_received !== 1) {
      const message = result.error?.message ?? `Meta returned HTTP ${response.status}`
      const retryable = response.status === 408 || response.status === 425 ||
        response.status === 429 || response.status >= 500
      throw new MetaConversionRequestError(message, retryable)
    }
    return result
  }

  private async recordFailure(claimed: typeof metaConversionOutbox.$inferSelect, error: unknown) {
    const retryable = error instanceof MetaConversionRequestError ? error.retryable : true
    const exhausted = claimed.attempts >= MAX_ATTEMPTS
    const shouldRetry = retryable && !exhausted
    const delayMinutes = Math.min(360, 2 ** Math.max(0, claimed.attempts - 1))
    const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000)
    const message = this.safeMessage(error).slice(0, 1_000)

    await this.db.update(metaConversionOutbox).set({
      status: shouldRetry ? 'retry' : 'permanent_failure',
      nextAttemptAt,
      lockedAt: null,
      lastError: message,
      updatedAt: new Date(),
    }).where(eq(metaConversionOutbox.id, claimed.id))

    const level = shouldRetry ? 'warn' : 'error'
    this.logger[level](`Meta CRM event ${claimed.eventName} failed for outbox ${claimed.id}: ${message}`)
  }

  private safeMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
  }
}
