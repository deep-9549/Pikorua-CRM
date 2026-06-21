import { createHmac, timingSafeEqual } from 'node:crypto'
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, leadCrmDetails } from '@pikorua/db'
import { normalizeMetaBudget, normalizeCampaignName, stripPhonePrefix } from '../../common/utils/meta-format'

interface MetaFieldData {
  name: string
  values?: string[]
}

interface MetaLeadData {
  id: string
  created_time?: string
  ad_id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  form_id?: string
  field_data?: MetaFieldData[]
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  verifyMeta(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge
    }
    return null
  }

  verifyMetaSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    const appSecret = process.env.META_APP_SECRET
    if (!appSecret || !rawBody || !signature?.startsWith('sha256=')) return false

    const suppliedDigest = signature.slice('sha256='.length)
    const expectedDigest = createHmac('sha256', appSecret).update(rawBody).digest('hex')

    if (!/^[a-f\d]{64}$/i.test(suppliedDigest)) return false

    return timingSafeEqual(
      Buffer.from(suppliedDigest, 'hex'),
      Buffer.from(expectedDigest, 'hex'),
    )
  }

  private async fetchMetaLead(leadgenId: string): Promise<MetaLeadData> {
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN
    const graphVersion = process.env.META_GRAPH_API_VERSION

    if (!accessToken || !graphVersion) {
      throw new InternalServerErrorException(
        'Meta lead retrieval is not configured: META_PAGE_ACCESS_TOKEN and META_GRAPH_API_VERSION are required',
      )
    }

    const url = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(leadgenId)}`)
    url.searchParams.set(
      'fields',
      'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data',
    )
    url.searchParams.set('access_token', accessToken)

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) {
      // Do not log the request URL because it contains the Page access token.
      const errorBody = await response.text()
      this.logger.error(
        `Meta Graph API failed for lead ${leadgenId} (${response.status}): ${errorBody.slice(0, 1_000)}`,
      )
      throw new InternalServerErrorException('Unable to retrieve lead details from Meta')
    }

    const lead = await response.json() as MetaLeadData
    if (!lead.id || !Array.isArray(lead.field_data)) {
      this.logger.error(`Meta returned an incomplete payload for lead ${leadgenId}`)
      throw new InternalServerErrorException('Meta returned incomplete lead details')
    }

    return lead
  }

  async ingestMetaLeads(body: Record<string, unknown>) {
    if (body.object !== 'page') return { ok: true }

    for (const entry of (body.entry as Record<string, unknown>[] ?? [])) {
      for (const change of (entry.changes as Record<string, unknown>[] ?? [])) {
        if ((change as Record<string, unknown>).field !== 'leadgen') continue
        const value = (change as Record<string, unknown>).value as Record<string, unknown>
        const leadgenId = value.leadgen_id as string | undefined
        if (!leadgenId) {
          this.logger.warn('Ignoring Meta leadgen webhook without a leadgen_id')
          continue
        }

        this.logger.log(`Received Meta leadgen webhook for lead ${leadgenId}`)
        const metaLead = await this.fetchMetaLead(leadgenId)
        const fields: Record<string, string> = {}
        for (const f of metaLead.field_data ?? []) {
          fields[f.name] = f.values?.[0] ?? ''
        }

        const rawPhone = fields['phone_number'] ?? fields['phone'] ?? null
        const createdTime = metaLead.created_time ? new Date(metaLead.created_time) : null
        const receivedAt = createdTime && !Number.isNaN(createdTime.getTime()) ? createdTime : undefined

        const [lead] = await this.db.insert(metaLeads).values({
          formId: metaLead.form_id ?? value.form_id as string ?? null,
          adId: metaLead.ad_id ?? value.ad_id as string ?? null,
          campaignName: normalizeCampaignName(metaLead.campaign_name ?? null),
          fullName: fields['full_name'] ?? fields['name'] ?? null,
          phone: rawPhone ? stripPhonePrefix(rawPhone) : null,
          email: fields['email'] ?? null,
          city: fields['city'] ?? null,
          formData: metaLead,
          source: 'meta_ads',
          externalId: leadgenId,
          status: 'unassigned',
          ...(receivedAt ? { receivedAt } : {}),
        }).onConflictDoNothing().returning({ id: metaLeads.id })

        if (!lead) {
          this.logger.log(`Ignoring duplicate Meta lead ${leadgenId}`)
          continue
        }

        this.logger.log(`Created CRM lead from Meta lead ${leadgenId}`)

        // Capture the qualitative form answers (budget / job title / company)
        // into CRM details so they're visible before assignment.
        const profession = fields['job_title'] ?? fields['profession'] ?? fields['occupation'] ?? null
        const companyName = fields['company_name'] ?? fields['company'] ?? null
        const budgetKey = Object.keys(fields).find(k => k.toLowerCase().includes('budget'))
        const budgetRange = budgetKey ? normalizeMetaBudget(fields[budgetKey]) : null

        if (lead && (profession || companyName || budgetRange)) {
          await this.db.insert(leadCrmDetails).values({
            leadId: lead.id,
            ...(profession  ? { profession } : {}),
            ...(companyName ? { companyName } : {}),
            ...(budgetRange ? { budgetRange } : {}),
          }).onConflictDoNothing()
        }
      }
    }

    return { ok: true }
  }
}
