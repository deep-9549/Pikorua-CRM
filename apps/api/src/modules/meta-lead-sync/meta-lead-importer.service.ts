import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { clients, leadCrmDetails, metaLeads } from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'
import {
  normalizeCampaignName,
  normalizeMetaBudget,
  normalizeMetaPlatform,
  stripPhonePrefix,
} from '../../common/utils/meta-format'
import { MetaLeadData } from './meta-lead.types'
import { poolStatusForClientStatus } from '../leads/lead-pools'

export type MetaLeadImportResult = 'imported' | 'duplicate'

@Injectable()
export class MetaLeadImporterService {
  constructor(private readonly database: DatabaseService) {}

  async importLead(
    metaLead: MetaLeadData,
    fallback: {
      pageId?: string | null
      pageName?: string | null
      formId?: string | null
      adId?: string | null
    } = {},
  ): Promise<MetaLeadImportResult> {
    const fields: Record<string, string> = {}
    for (const field of metaLead.field_data ?? []) {
      fields[field.name] = field.values?.[0] ?? ''
    }

    const rawPhone = fields.phone_number ?? fields.phone ?? null
    const createdTime = metaLead.created_time ? new Date(metaLead.created_time) : null
    const receivedAt = createdTime && !Number.isNaN(createdTime.getTime())
      ? createdTime
      : undefined

    return this.database.db.transaction(async (tx) => {
      const phone = rawPhone ? stripPhonePrefix(rawPhone) : null
      const existingClient = phone
        ? await tx.query.clients.findFirst({ where: eq(clients.phone, phone) })
        : null
      const pooledStatus = poolStatusForClientStatus(existingClient?.status)

      const [inserted] = await tx.insert(metaLeads).values({
        pageId: fallback.pageId ?? null,
        pageName: fallback.pageName ?? null,
        formId: metaLead.form_id ?? fallback.formId ?? null,
        adId: metaLead.ad_id ?? fallback.adId ?? null,
        platform: normalizeMetaPlatform(metaLead.platform ?? fields.platform),
        campaignName: normalizeCampaignName(metaLead.campaign_name ?? null),
        fullName: fields.full_name ?? fields.name ?? null,
        phone,
        email: fields.email ?? null,
        city: fields.city ?? null,
        formData: metaLead,
        source: 'meta_ads',
        externalId: metaLead.id,
        clientId: existingClient?.id ?? null,
        status: (pooledStatus ?? 'unassigned') as never,
        ...(receivedAt ? { receivedAt } : {}),
      }).onConflictDoNothing().returning({ id: metaLeads.id })

      if (!inserted) return 'duplicate'

      const profession = fields.job_title ?? fields.profession ?? fields.occupation ?? null
      const companyName = fields.company_name ?? fields.company ?? null
      const budgetKey = Object.keys(fields).find((key) => key.toLowerCase().includes('budget'))
      const budgetRange = budgetKey ? normalizeMetaBudget(fields[budgetKey]) : null

      if (profession || companyName || budgetRange) {
        await tx.insert(leadCrmDetails).values({
          leadId: inserted.id,
          ...(profession ? { profession } : {}),
          ...(companyName ? { companyName } : {}),
          ...(budgetRange ? { budgetRange } : {}),
        }).onConflictDoNothing()
      }

      return 'imported'
    })
  }
}
