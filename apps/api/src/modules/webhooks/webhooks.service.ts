import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, leadCrmDetails } from '@pikorua/db'
import { normalizeMetaBudget, stripPhonePrefix } from '../../common/utils/meta-format'

@Injectable()
export class WebhooksService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  verifyMeta(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge
    }
    return null
  }

  async ingestMetaLeads(body: Record<string, unknown>) {
    if (body.object !== 'page') return { ok: true }

    for (const entry of (body.entry as Record<string, unknown>[] ?? [])) {
      for (const change of (entry.changes as Record<string, unknown>[] ?? [])) {
        if ((change as Record<string, unknown>).field !== 'leadgen') continue
        const value = (change as Record<string, unknown>).value as Record<string, unknown>
        const fields: Record<string, string> = {}
        for (const f of (value.field_data as { name: string; values: string[] }[] ?? [])) {
          fields[f.name] = f.values?.[0] ?? ''
        }

        const rawPhone = fields['phone_number'] ?? fields['phone'] ?? null

        const [lead] = await this.db.insert(metaLeads).values({
          formId: value.form_id as string ?? null,
          adId: value.ad_id as string ?? null,
          campaignName: value.campaign_name as string ?? null,
          fullName: fields['full_name'] ?? fields['name'] ?? null,
          phone: rawPhone ? stripPhonePrefix(rawPhone) : null,
          email: fields['email'] ?? null,
          city: fields['city'] ?? null,
          formData: value,
          source: 'meta_ads',
          status: 'unassigned',
        }).returning({ id: metaLeads.id })

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
