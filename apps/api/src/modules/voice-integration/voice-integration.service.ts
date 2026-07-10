import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm'
import {
  clients,
  leadCrmDetails,
  metaLeads,
  voiceCallLogs,
  voiceEvents,
  voiceLeadScores,
  voiceSyncAuditLog,
  voiceTranscriptTurns,
} from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'
import { LeadActivityService } from '../lead-activity/lead-activity.service'
import { poolStatusForClientStatus } from '../leads/lead-pools'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'
const LABELS = new Set(['hot', 'warm', 'cold'])
const TIMELINES = new Set(['immediate', 'short_term', 'long_term', 'exploring', 'unknown'])
const LOCALES = new Set(['hi', 'en', 'gu'])
const DIRECTIONS = new Set(['inbound', 'outbound'])
const EVENT_TYPES = new Set(['hot_alert', 'dnc_requested', 'consultant_transfer', 'escalation', 'guardrail_block'])

type MachineRequest = {
  authorization?: string
  signature?: string
  timestamp?: string
  idempotencyKey?: string
  requestId?: string
  rawBody?: Buffer
  body: Record<string, unknown>
}

type MachineResponse = {
  statusCode: number
  body: Record<string, unknown>
}

type NormalizedTurn = {
  index: number
  role: 'caller' | 'assistant' | 'system'
  text: string
  locale: 'hi' | 'en' | 'gu' | null
  telemetry: {
    sttLatencyMs?: number | null
    llmLatencyMs?: number | null
    ttsLatencyMs?: number | null
    tokens?: { prompt?: number | null; completion?: number | null }
    guardrailFlags?: string[]
  }
}

type NormalizedCallResult = {
  callId: string
  crmLeadId: string | null
  campaign: { id: string | null; name: string | null }
  direction: 'inbound' | 'outbound'
  call: {
    exotelCallSid: string | null
    status: string | null
    from: string | null
    to: string | null
    locale: 'hi' | 'en' | 'gu' | null
    timestamps: Record<string, string | null>
    durationSec: number | null
    recordingUrl: string | null
    hangupCause: string | null
    transferTarget: string | null
    consentToRecording: boolean | null
  }
  contactPhone: string | null
  transcriptTurns: NormalizedTurn[]
  score: {
    value: number
    label: 'hot' | 'warm' | 'cold'
    rationale: string | null
    timeline: 'immediate' | 'short_term' | 'long_term' | 'exploring' | 'unknown'
    signals: { positive: string[]; negative: string[] }
    source: 'llm' | 'heuristic'
    scoredAt: string | null
  }
  events: Array<{ type: string; at: string | null; detail: Record<string, unknown> }>
}

@Injectable()
export class VoiceIntegrationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  private get db() { return this.database.db }

  async ingestCallResult(input: MachineRequest): Promise<MachineResponse> {
    this.verifyMachineRequest(input, true)
    const idempotencyKey = this.requireIdempotency(input.idempotencyKey)

    const replay = await this.findReplay(idempotencyKey)
    if (replay) return replay

    const normalized = this.normalizeCallResult(input.body)
    if (!idempotencyKey.includes(normalized.callId)) {
      throw new BadRequestException('Idempotency-Key must include callId')
    }

    const existingCall = await this.db.query.voiceCallLogs.findFirst({
      where: eq(voiceCallLogs.callId, normalized.callId),
    })
    if (existingCall) {
      const body = {
        crmLeadId: existingCall.leadId,
        callLogId: existingCall.id,
        created: false,
        status: 'duplicate_ignored',
        receivedAt: existingCall.receivedAt,
      }
      await this.writeAudit({
        idempotencyKey,
        endpoint: '/api/v1/voice/call-results',
        requestId: input.requestId ?? null,
        rawPayload: input.body,
        responseBody: body,
        resultStatus: 'duplicate_ignored',
        httpStatus: 200,
      })
      return { statusCode: 200, body }
    }

    const result = await this.db.transaction(async (tx) => {
      const { lead, created } = await this.findOrCreateLead(tx, {
        crmLeadId: normalized.crmLeadId,
        phone: normalized.contactPhone,
        callId: normalized.callId,
        campaignName: normalized.campaign.name,
        locale: normalized.call.locale,
        direction: normalized.direction,
      })

      const [callLog] = await tx.insert(voiceCallLogs).values({
        leadId: lead.id,
        callId: normalized.callId,
        exotelCallSid: normalized.call.exotelCallSid,
        campaignId: normalized.campaign.id,
        campaignName: normalized.campaign.name,
        direction: normalized.direction,
        status: normalized.call.status,
        hangupCause: normalized.call.hangupCause,
        locale: normalized.call.locale as never,
        fromNumber: normalized.call.from,
        toNumber: normalized.call.to,
        phoneE164: this.normalizePhone(normalized.contactPhone),
        queuedAt: this.toDate(normalized.call.timestamps.queued),
        initiatedAt: this.toDate(normalized.call.timestamps.initiated),
        answeredAt: this.toDate(normalized.call.timestamps.answered),
        endedAt: this.toDate(normalized.call.timestamps.ended),
        durationSec: normalized.call.durationSec,
        recordingUrl: normalized.call.recordingUrl,
        transferTarget: normalized.call.transferTarget,
        consentToRecording: normalized.call.consentToRecording,
        rawPayload: input.body,
      }).returning()

      if (normalized.transcriptTurns.length > 0) {
        await tx.insert(voiceTranscriptTurns).values(normalized.transcriptTurns.map((turn) => ({
          callLogId: callLog.id,
          turnIndex: turn.index,
          role: turn.role,
          text: turn.text,
          locale: turn.locale as never,
          sttMs: this.numberOrNull(turn.telemetry.sttLatencyMs),
          llmMs: this.numberOrNull(turn.telemetry.llmLatencyMs),
          ttsMs: this.numberOrNull(turn.telemetry.ttsLatencyMs),
          tokensPrompt: this.numberOrNull(turn.telemetry.tokens?.prompt),
          tokensCompletion: this.numberOrNull(turn.telemetry.tokens?.completion),
          guardrailFlags: turn.telemetry.guardrailFlags ?? [],
        })))
      }

      const [score] = await tx.insert(voiceLeadScores).values({
        leadId: lead.id,
        callLogId: callLog.id,
        score: normalized.score.value,
        labelAi: normalized.score.label,
        timeline: normalized.score.timeline,
        rationale: normalized.score.rationale,
        signalsPositive: normalized.score.signals.positive,
        signalsNegative: normalized.score.signals.negative,
        source: normalized.score.source,
        scoredAt: this.toDate(normalized.score.scoredAt),
      }).returning()

      await this.leadActivityService.record({
        leadId: lead.id,
        eventType: created ? 'lead_created' : 'crm_updated',
        source: 'voice_ai',
        title: created ? 'AI voice lead created' : 'AI voice call attached',
        description: `${normalized.score.label.toUpperCase()} AI voice call scored ${normalized.score.value}/100.`,
        metadata: {
          call_id: normalized.callId,
          call_log_id: callLog.id,
          score_id: score.id,
          direction: normalized.direction,
        },
      }, tx)

      for (const event of normalized.events) {
        if (!EVENT_TYPES.has(event.type)) continue
        await tx.insert(voiceEvents).values({
          eventId: `${normalized.callId}:${event.type}:${event.at ?? callLog.id}`,
          callId: normalized.callId,
          leadId: lead.id,
          type: event.type as never,
          at: this.toDate(event.at) ?? new Date(),
          detail: event.detail,
          idempotencyKey: `${idempotencyKey}:${event.type}`,
        }).onConflictDoNothing()
      }

      const body = {
        crmLeadId: lead.id,
        callLogId: callLog.id,
        created,
        status: 'ingested',
        receivedAt: callLog.receivedAt,
      }

      await tx.insert(voiceSyncAuditLog).values({
        idempotencyKey,
        endpoint: '/api/v1/voice/call-results',
        requestId: input.requestId ?? null,
        rawPayload: input.body,
        responseBody: body,
        resultStatus: 'ingested',
        httpStatus: created ? 201 : 200,
      })

      return { statusCode: created ? 201 : 200, body }
    })

    return result
  }

  async ingestEvent(input: MachineRequest): Promise<MachineResponse> {
    this.verifyMachineRequest(input, true)
    const idempotencyKey = this.requireIdempotency(input.idempotencyKey)
    const replay = await this.findReplay(idempotencyKey)
    if (replay) return { statusCode: 202, body: replay.body }

    const event = this.normalizeEvent(input.body)

    const result = await this.db.transaction(async (tx) => {
      const { lead } = await this.findOrCreateLead(tx, {
        crmLeadId: event.crmLeadId,
        phone: event.phone,
        callId: event.callId,
        campaignName: null,
        locale: event.locale,
        direction: null,
      })

      const [saved] = await tx.insert(voiceEvents).values({
        eventId: event.eventId,
        callId: event.callId,
        leadId: lead.id,
        type: event.type as never,
        at: event.at,
        detail: event.detail,
        idempotencyKey,
      }).returning()

      if (event.type === 'dnc_requested') {
        await tx.update(voiceCallLogs)
          .set({ dnc: true, updatedAt: new Date() })
          .where(eq(voiceCallLogs.leadId, lead.id))
      }

      const body = { status: 'accepted', eventId: saved.eventId, crmLeadId: lead.id }
      await tx.insert(voiceSyncAuditLog).values({
        idempotencyKey,
        endpoint: '/api/v1/voice/events',
        requestId: input.requestId ?? null,
        rawPayload: input.body,
        responseBody: body,
        resultStatus: 'accepted',
        httpStatus: 202,
      })

      return { statusCode: 202, body }
    })

    return result
  }

  async getDialList(input: { authorization?: string; campaign?: string; limit?: string; cursor?: string }) {
    this.verifyBearer(input.authorization)
    const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 200)
    const conditions = [isNull(metaLeads.deletedAt)]
    if (input.campaign) conditions.push(eq(metaLeads.campaignName, input.campaign))
    const cursorDate = this.toDate(input.cursor ?? null)
    if (cursorDate) conditions.push(lt(metaLeads.receivedAt, cursorDate))

    const dncLeadIds = await this.dncLeadIds()
    const leads = await this.db.query.metaLeads.findMany({
      where: and(...conditions),
      orderBy: [desc(metaLeads.receivedAt)],
      limit: limit + dncLeadIds.length + 1,
    })

    const filtered = leads.filter((lead) => !dncLeadIds.includes(lead.id)).slice(0, limit)
    const last = filtered[filtered.length - 1]
    return {
      campaign: { id: input.campaign ?? null, name: input.campaign ?? null },
      items: filtered.map((lead) => ({
        crmLeadId: lead.id,
        name: lead.fullName,
        phone: this.normalizePhone(lead.phone),
        preferredLocale: this.preferredLocaleFromFormData(lead.formData),
        consentToCall: true,
      })).filter((item) => Boolean(item.phone)),
      nextCursor: last?.receivedAt?.toISOString() ?? null,
    }
  }

  async getQueue(user: { id: string; role: string }, query: Record<string, string | undefined>) {
    const rows = await this.db.query.voiceCallLogs.findMany({
      with: {
        lead: { with: { assignedToProfile: true } },
        scores: { orderBy: [desc(voiceLeadScores.createdAt)] },
      },
      orderBy: [desc(voiceCallLogs.receivedAt)],
      limit: 1000,
    })

    const items = rows
      .filter((row: any) => this.canAccessLead(row.lead, user))
      .map((row: any) => this.serializeQueueItem(row))
      .filter((item) => this.matchesQueueFilters(item, query))
      .sort((a, b) => this.queueSort(a, b, query.scoreSort))

    return { items }
  }

  async getCallDetail(id: string, user: { id: string; role: string }) {
    const row = await this.db.query.voiceCallLogs.findFirst({
      where: eq(voiceCallLogs.id, id),
      with: {
        lead: { with: { assignedToProfile: true } },
        transcriptTurns: { orderBy: [voiceTranscriptTurns.turnIndex] },
        scores: { orderBy: [desc(voiceLeadScores.createdAt)] },
      },
    })
    if (!row) throw new NotFoundException('Voice call not found')
    if (!this.canAccessLead((row as any).lead, user)) throw new ForbiddenException('You can only view assigned voice leads')
    return { call: this.serializeCallDetail(row as any) }
  }

  async setReviewed(id: string, reviewed: boolean, user: { id: string; role: string }) {
    const detail = await this.getCallDetail(id, user)
    const [updated] = await this.db.update(voiceCallLogs)
      .set({ reviewed, updatedAt: new Date() })
      .where(eq(voiceCallLogs.id, id))
      .returning()
    return { call: { ...detail.call, reviewed: updated.reviewed } }
  }

  async deleteCallLog(id: string, user: { id: string; role: string }) {
    if (user.role !== 'super_admin') throw new ForbiddenException('Only super admins can delete voice call logs')

    const row = await this.db.query.voiceCallLogs.findFirst({
      where: eq(voiceCallLogs.id, id),
      columns: { id: true, callId: true, leadId: true },
    })
    if (!row) throw new NotFoundException('Voice call not found')

    await this.db.transaction(async (tx) => {
      await tx.delete(voiceEvents).where(eq(voiceEvents.callId, row.callId))
      await tx.delete(voiceCallLogs).where(eq(voiceCallLogs.id, id))
    })

    return {
      deleted: true,
      call: {
        id: row.id,
        call_id: row.callId,
        crm_lead_id: row.leadId,
      },
    }
  }

  async overrideScore(id: string, body: { label?: string; reason?: string }, user: { id: string; role: string }) {
    if (!body.label || !LABELS.has(body.label)) throw new BadRequestException('label must be hot, warm, or cold')
    if (!body.reason?.trim()) throw new BadRequestException('override reason is required')

    const score = await this.db.query.voiceLeadScores.findFirst({
      where: eq(voiceLeadScores.id, id),
      with: { callLog: { with: { lead: true } } },
    })
    if (!score) throw new NotFoundException('Voice score not found')
    if (!this.canAccessLead((score as any).callLog?.lead, user)) throw new ForbiddenException('You can only override assigned voice leads')

    const [updated] = await this.db.update(voiceLeadScores).set({
      labelOverride: body.label as never,
      overrideReason: body.reason.trim(),
      overrideBy: user.id,
      overrideAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(voiceLeadScores.id, id)).returning()

    return { score: this.serializeScore(updated) }
  }

  async getAlerts(user: { id: string; role: string }, unreadOnly: boolean) {
    const rows = await this.db.query.voiceEvents.findMany({
      where: unreadOnly ? eq(voiceEvents.read, false) : undefined,
      with: { lead: { with: { assignedToProfile: true } } },
      orderBy: [desc(voiceEvents.createdAt)],
      limit: 50,
    })
    return {
      alerts: rows
        .filter((event: any) => this.canAccessLead(event.lead, user))
        .map((event: any) => this.serializeEvent(event)),
    }
  }

  async markAlertRead(id: string, user: { id: string; role: string }) {
    const event = await this.db.query.voiceEvents.findFirst({
      where: eq(voiceEvents.id, id),
      with: { lead: true },
    })
    if (!event) throw new NotFoundException('Voice alert not found')
    if (!this.canAccessLead((event as any).lead, user)) throw new ForbiddenException('You can only update assigned voice alerts')
    const [updated] = await this.db.update(voiceEvents).set({ read: true }).where(eq(voiceEvents.id, id)).returning()
    return { alert: this.serializeEvent({ ...updated, lead: (event as any).lead }) }
  }

  private verifyMachineRequest(input: MachineRequest, requireSignature: boolean) {
    this.verifyBearer(input.authorization)
    if (requireSignature) this.verifySignature(input)
  }

  private verifyBearer(authorization?: string) {
    const expected = this.config.get<string>('VOICE_API_BEARER_TOKEN')
    if (!expected) throw new ServiceUnavailableException('Voice API token is not configured')
    const actual = authorization?.replace(/^Bearer\s+/i, '').trim()
    if (!actual || actual !== expected) throw new UnauthorizedException('Invalid Voice bearer token')
  }

  private verifySignature(input: MachineRequest) {
    const secret = this.config.get<string>('VOICE_WEBHOOK_HMAC_SECRET')
    if (!secret) throw new ServiceUnavailableException('Voice HMAC secret is not configured')
    if (!input.signature) throw new ForbiddenException('Missing X-Signature')
    if (!input.timestamp) throw new UnauthorizedException('Missing X-Timestamp')

    const skewSeconds = Number(this.config.get<string>('VOICE_ALLOWED_CLOCK_SKEW_SECONDS') ?? '300')
    const timestampMs = new Date(input.timestamp).getTime()
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > skewSeconds * 1000) {
      throw new UnauthorizedException('Stale X-Timestamp')
    }

    const raw = input.rawBody ?? Buffer.from(JSON.stringify(input.body), 'utf8')
    const expectedHex = createHmac('sha256', secret).update(raw).digest('hex')
    const providedHex = input.signature.replace(/^sha256=/i, '').trim()
    const expected = Buffer.from(expectedHex, 'hex')
    const provided = Buffer.from(providedHex, 'hex')
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new ForbiddenException('Invalid X-Signature')
    }
  }

  private requireIdempotency(value?: string) {
    if (!value?.trim()) throw new BadRequestException('Idempotency-Key is required')
    return value.trim()
  }

  private async findReplay(idempotencyKey: string): Promise<MachineResponse | null> {
    const audit = await this.db.query.voiceSyncAuditLog.findFirst({
      where: eq(voiceSyncAuditLog.idempotencyKey, idempotencyKey),
    })
    if (!audit?.responseBody) return null
    return {
      statusCode: 200,
      body: { ...(audit.responseBody as Record<string, unknown>), status: 'duplicate_ignored' },
    }
  }

  private async writeAudit(input: typeof voiceSyncAuditLog.$inferInsert) {
    await this.db.insert(voiceSyncAuditLog).values(input).onConflictDoNothing()
  }

  private normalizeCallResult(body: Record<string, unknown>): NormalizedCallResult {
    const callId = this.stringOrNull(body.callId)
    if (!callId) throw new BadRequestException('callId is required')

    const structuredTranscript = this.asRecord(body.transcript)
    const call = this.asRecord(body.call)
    const scoreRecord = this.asRecord(body.score)
    const isStructured = Array.isArray(structuredTranscript?.turns) || Boolean(call)
    const direction = this.enumValue(body.direction, DIRECTIONS, 'inbound') as 'inbound' | 'outbound'
    const contactPhone = isStructured
      ? this.contactPhone(direction, this.stringOrNull(call?.from), this.stringOrNull(call?.to))
      : this.stringOrNull(body.phone)

    const scoreValue = Number(isStructured ? scoreRecord?.value : body.score)
    if (!Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      throw new UnprocessableEntityException('score must be 0-100')
    }
    const label = this.enumValue(isStructured ? scoreRecord?.label : body.label, LABELS, this.labelFromScore(scoreValue)) as 'hot' | 'warm' | 'cold'

    const turns = isStructured
      ? this.normalizeTurns(structuredTranscript?.turns)
      : this.normalizeFlatTranscript(this.stringOrNull(body.transcript))

    return {
      callId,
      crmLeadId: this.stringOrNull(body.crmLeadId),
      campaign: {
        id: this.stringOrNull(this.asRecord(body.campaign)?.id),
        name: this.stringOrNull(this.asRecord(body.campaign)?.name),
      },
      direction,
      call: {
        exotelCallSid: this.stringOrNull(call?.exotelCallSid),
        status: this.stringOrNull(call?.status) ?? 'completed',
        from: this.stringOrNull(call?.from),
        to: this.stringOrNull(call?.to),
        locale: this.enumValue(call?.locale, LOCALES, null) as 'hi' | 'en' | 'gu' | null,
        timestamps: this.asRecord(call?.timestamps) as Record<string, string | null> ?? {},
        durationSec: this.numberOrNull(call?.durationSec),
        recordingUrl: this.stringOrNull(call?.recordingUrl),
        hangupCause: this.stringOrNull(call?.hangupCause),
        transferTarget: this.stringOrNull(call?.transferTarget),
        consentToRecording: typeof call?.consentToRecording === 'boolean' ? call.consentToRecording : null,
      },
      contactPhone,
      transcriptTurns: turns,
      score: {
        value: Math.round(scoreValue),
        label,
        rationale: this.stringOrNull(scoreRecord?.rationale),
        timeline: this.enumValue(scoreRecord?.timeline, TIMELINES, 'unknown') as NormalizedCallResult['score']['timeline'],
        signals: {
          positive: this.stringArray(this.asRecord(scoreRecord?.signals)?.positive),
          negative: this.stringArray(this.asRecord(scoreRecord?.signals)?.negative),
        },
        source: this.enumValue(isStructured ? scoreRecord?.source : body.source, new Set(['llm', 'heuristic']), 'heuristic') as 'llm' | 'heuristic',
        scoredAt: this.stringOrNull(scoreRecord?.scoredAt),
      },
      events: Array.isArray(body.events)
        ? body.events.map((raw) => this.asRecord(raw)).filter(Boolean).map((event) => ({
            type: this.stringOrNull(event?.type) ?? '',
            at: this.stringOrNull(event?.at),
            detail: this.asRecord(event?.detail) ?? {},
          }))
        : [],
    }
  }

  private normalizeEvent(body: Record<string, unknown>) {
    const eventId = this.stringOrNull(body.eventId)
    const callId = this.stringOrNull(body.callId)
    const type = this.stringOrNull(body.type)
    const at = this.toDate(this.stringOrNull(body.at))
    if (!eventId) throw new BadRequestException('eventId is required')
    if (!callId) throw new BadRequestException('callId is required')
    if (!type || !EVENT_TYPES.has(type)) throw new UnprocessableEntityException('invalid event type')
    if (!at) throw new BadRequestException('at is required')
    const detail = this.asRecord(body.detail) ?? {}
    return {
      eventId,
      callId,
      crmLeadId: this.stringOrNull(body.crmLeadId),
      type,
      at,
      detail,
      phone: this.stringOrNull(detail.phone),
      locale: this.enumValue(detail.locale, LOCALES, null) as 'hi' | 'en' | 'gu' | null,
    }
  }

  private async findOrCreateLead(tx: any, input: {
    crmLeadId: string | null
    phone: string | null
    callId: string
    campaignName: string | null
    locale: 'hi' | 'en' | 'gu' | null
    direction: 'inbound' | 'outbound' | null
  }) {
    if (input.crmLeadId) {
      const lead = await tx.query.metaLeads.findFirst({
        where: and(eq(metaLeads.id, input.crmLeadId), isNull(metaLeads.deletedAt)),
      })
      if (!lead) throw new UnprocessableEntityException('crmLeadId does not exist')
      return { lead, created: false }
    }

    const phoneE164 = this.normalizePhone(input.phone)
    if (!phoneE164) throw new UnprocessableEntityException('phone is required when crmLeadId is null')

    const existing = await tx.query.metaLeads.findFirst({
      where: and(
        isNull(metaLeads.deletedAt),
        or(eq(metaLeads.phone, phoneE164), eq(metaLeads.phone, input.phone ?? phoneE164)),
      ),
    })
    if (existing) return { lead: existing, created: false }

    const existingClient = await tx.query.clients.findFirst({
      where: eq(clients.phone, phoneE164),
    })
    const pooledStatus = poolStatusForClientStatus(existingClient?.status)

    const [lead] = await tx.insert(metaLeads).values({
      phone: phoneE164,
      campaignName: input.campaignName,
      source: 'voice_ai',
      externalId: `voice:${input.callId}`,
      clientId: existingClient?.id ?? null,
      status: (pooledStatus ?? 'unassigned') as never,
      formData: {
        source: 'voice_ai',
        preferred_locale: input.locale,
        direction: input.direction,
      },
      receivedAt: new Date(),
    }).returning()

    await tx.insert(leadCrmDetails).values({
      leadId: lead.id,
    }).onConflictDoNothing()

    return { lead, created: true }
  }

  private canAccessLead(lead: any, user: { id: string; role: string }) {
    if (!lead) return false
    if (user.role === 'super_admin') return true
    return lead.assignedTo === user.id
  }

  private serializeQueueItem(row: any) {
    const score = row.scores?.[0] ?? null
    return {
      id: row.id,
      call_id: row.callId,
      crm_lead_id: row.leadId,
      lead_name: row.lead?.fullName ?? null,
      phone: row.phoneE164 ?? row.lead?.phone ?? null,
      campaign_name: row.campaignName ?? row.lead?.campaignName ?? null,
      direction: row.direction,
      locale: row.locale,
      reviewed: row.reviewed,
      dnc: row.dnc,
      status: row.status,
      duration_sec: row.durationSec,
      recording_url: row.recordingUrl,
      answered_at: row.answeredAt,
      received_at: row.receivedAt,
      assigned_to_profile: row.lead?.assignedToProfile ? {
        id: row.lead.assignedToProfile.id,
        full_name: row.lead.assignedToProfile.fullName,
      } : null,
      score: score ? this.serializeScore(score) : null,
    }
  }

  private serializeCallDetail(row: any) {
    return {
      ...this.serializeQueueItem(row),
      exotel_call_sid: row.exotelCallSid,
      hangup_cause: row.hangupCause,
      from_number: row.fromNumber,
      to_number: row.toNumber,
      queued_at: row.queuedAt,
      initiated_at: row.initiatedAt,
      ended_at: row.endedAt,
      transfer_target: row.transferTarget,
      consent_to_recording: row.consentToRecording,
      transcript_turns: (row.transcriptTurns ?? []).map((turn: any) => ({
        id: turn.id,
        index: turn.turnIndex,
        role: turn.role,
        text: turn.text,
        locale: turn.locale,
        telemetry: {
          stt_ms: turn.sttMs,
          llm_ms: turn.llmMs,
          tts_ms: turn.ttsMs,
          tokens_prompt: turn.tokensPrompt,
          tokens_completion: turn.tokensCompletion,
          guardrail_flags: turn.guardrailFlags ?? [],
        },
      })),
    }
  }

  private serializeScore(score: any) {
    return {
      id: score.id,
      score: score.score,
      label_ai: score.labelAi,
      label_override: score.labelOverride,
      effective_label: score.labelOverride ?? score.labelAi,
      override_reason: score.overrideReason,
      override_by: score.overrideBy,
      override_at: score.overrideAt,
      timeline: score.timeline,
      rationale: score.rationale,
      signals_positive: score.signalsPositive ?? [],
      signals_negative: score.signalsNegative ?? [],
      source: score.source,
      scored_at: score.scoredAt,
      created_at: score.createdAt,
    }
  }

  private serializeEvent(event: any) {
    return {
      id: event.id,
      event_id: event.eventId,
      call_id: event.callId,
      crm_lead_id: event.leadId,
      type: event.type,
      at: event.at,
      detail: event.detail ?? {},
      read: event.read,
      created_at: event.createdAt,
      lead: event.lead ? {
        id: event.lead.id,
        full_name: event.lead.fullName,
        phone: event.lead.phone,
        assigned_to_profile: event.lead.assignedToProfile ? {
          id: event.lead.assignedToProfile.id,
          full_name: event.lead.assignedToProfile.fullName,
        } : null,
      } : null,
    }
  }

  private matchesQueueFilters(item: any, query: Record<string, string | undefined>) {
    const score = item.score
    if (query.label && score?.effective_label !== query.label) return false
    if (query.timeline && score?.timeline !== query.timeline) return false
    if (query.locale && item.locale !== query.locale) return false
    if (query.direction && item.direction !== query.direction) return false
    if (query.reviewed === 'true' && !item.reviewed) return false
    if (query.reviewed === 'false' && item.reviewed) return false
    if (query.assignedTo && item.assigned_to_profile?.id !== query.assignedTo) return false
    if (query.campaign && item.campaign_name !== query.campaign) return false
    const receivedAt = this.toDate(item.received_at)?.getTime()
    const from = this.filterDateBoundary(query.dateFrom, false)?.getTime()
    const to = this.filterDateBoundary(query.dateTo, true)?.getTime()
    if (from && (!receivedAt || receivedAt < from)) return false
    if (to && (!receivedAt || receivedAt > to)) return false
    if (query.hotAlerts === 'true' && score?.effective_label !== 'hot') return false
    return true
  }

  private filterDateBoundary(value: string | undefined, endOfDay: boolean) {
    if (!value) return null
    const suffix = endOfDay ? 'T23:59:59.999+05:30' : 'T00:00:00.000+05:30'
    return this.toDate(`${value}${suffix}`)
  }

  private queueSort(a: any, b: any, scoreSort?: string) {
    if (scoreSort === 'asc') {
      const aScore = typeof a.score?.score === 'number' ? a.score.score : Number.POSITIVE_INFINITY
      const bScore = typeof b.score?.score === 'number' ? b.score.score : Number.POSITIVE_INFINITY
      return aScore - bScore
    }
    if (scoreSort === 'desc') {
      const aScore = typeof a.score?.score === 'number' ? a.score.score : Number.NEGATIVE_INFINITY
      const bScore = typeof b.score?.score === 'number' ? b.score.score : Number.NEGATIVE_INFINITY
      return bScore - aScore
    }
    return this.queueRank(a) - this.queueRank(b)
  }

  private queueRank(item: any) {
    const labelWeight = item.score?.effective_label === 'hot' ? 0 : item.score?.effective_label === 'warm' ? 1 : 2
    const reviewedWeight = item.reviewed ? 10 : 0
    return reviewedWeight + labelWeight
  }

  private async dncLeadIds() {
    const logs = await this.db.query.voiceCallLogs.findMany({
      where: eq(voiceCallLogs.dnc, true),
      columns: { leadId: true },
    })
    const events = await this.db.query.voiceEvents.findMany({
      where: eq(voiceEvents.type, 'dnc_requested'),
      columns: { leadId: true },
    })
    return [...new Set([
      ...logs.map(row => row.leadId),
      ...events.map(row => row.leadId).filter(Boolean) as string[],
    ])]
  }

  private preferredLocaleFromFormData(formData: unknown) {
    const value = this.asRecord(formData)?.preferred_locale
    return this.enumValue(value, LOCALES, null)
  }

  private normalizeTurns(value: unknown): NormalizedTurn[] {
    if (!Array.isArray(value)) return []
    return value.map((raw, fallbackIndex) => {
      const turn = this.asRecord(raw) ?? {}
      const telemetry = this.asRecord(turn.telemetry) ?? {}
      return {
        index: this.numberOrNull(turn.index) ?? fallbackIndex,
        role: this.enumValue(turn.role, new Set(['caller', 'assistant', 'system']), 'system') as NormalizedTurn['role'],
        text: this.stringOrNull(turn.text) ?? '',
        locale: this.enumValue(turn.locale, LOCALES, null) as NormalizedTurn['locale'],
        telemetry: {
          sttLatencyMs: this.numberOrNull(telemetry.sttLatencyMs),
          llmLatencyMs: this.numberOrNull(telemetry.llmLatencyMs),
          ttsLatencyMs: this.numberOrNull(telemetry.ttsLatencyMs),
          tokens: this.asRecord(telemetry.tokens) ?? {},
          guardrailFlags: this.stringArray(telemetry.guardrailFlags),
        },
      }
    }).filter(turn => turn.text.trim() !== '')
  }

  private normalizeFlatTranscript(value: string | null): NormalizedTurn[] {
    if (!value?.trim()) return []
    return [{
      index: 0,
      role: 'system',
      text: value,
      locale: null,
      telemetry: {},
    }]
  }

  private labelFromScore(score: number) {
    if (score >= 75) return 'hot'
    if (score >= 45) return 'warm'
    return 'cold'
  }

  private contactPhone(direction: string, from: string | null, to: string | null) {
    return direction === 'outbound' ? to : from
  }

  private normalizePhone(value: string | null | undefined) {
    if (!value) return null
    const digits = value.replace(/\D/g, '')
    if (!digits) return null
    if (digits.length === 10) return `+91${digits}`
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
    return value.startsWith('+') ? `+${digits}` : `+${digits}`
  }

  private toDate(value: string | null | undefined) {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  private asRecord(value: unknown): Record<string, any> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null
  }

  private stringOrNull(value: unknown) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
  }

  private numberOrNull(value: unknown) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }

  private stringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }

  private enumValue(value: unknown, allowed: Set<string>, fallback: string | null) {
    return typeof value === 'string' && allowed.has(value) ? value : fallback
  }
}
