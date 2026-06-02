import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../database/database.service'
import { metaLeads } from '@pikorua/db'

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

    const inserts: Promise<unknown>[] = []

    for (const entry of (body.entry as Record<string, unknown>[] ?? [])) {
      for (const change of (entry.changes as Record<string, unknown>[] ?? [])) {
        if ((change as Record<string, unknown>).field !== 'leadgen') continue
        const value = (change as Record<string, unknown>).value as Record<string, unknown>
        const fields: Record<string, string> = {}
        for (const f of (value.field_data as { name: string; values: string[] }[] ?? [])) {
          fields[f.name] = f.values?.[0] ?? ''
        }
        inserts.push(
          this.db.insert(metaLeads).values({
            formId: value.form_id as string ?? null,
            adId: value.ad_id as string ?? null,
            campaignName: value.campaign_name as string ?? null,
            fullName: fields['full_name'] ?? fields['name'] ?? null,
            phone: fields['phone_number'] ?? fields['phone'] ?? null,
            email: fields['email'] ?? null,
            city: fields['city'] ?? null,
            formData: value,
            source: 'meta_ads',
            status: 'unassigned',
          })
        )
      }
    }

    await Promise.all(inserts)
    return { ok: true }
  }
}
