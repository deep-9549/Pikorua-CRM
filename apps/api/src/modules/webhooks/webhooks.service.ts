import { createHmac, timingSafeEqual } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { MetaGraphService } from '../meta-lead-sync/meta-graph.service'
import { MetaLeadImporterService } from '../meta-lead-sync/meta-lead-importer.service'
import { findMetaPageConfig } from '../meta-lead-sync/meta-page-config'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(
    private readonly graph: MetaGraphService,
    private readonly importer: MetaLeadImporterService,
  ) {}

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

  async ingestMetaLeads(body: Record<string, unknown>) {
    if (body.object !== 'page') return { ok: true }

    for (const entry of (body.entry as Record<string, unknown>[] ?? [])) {
      const pageId = typeof entry.id === 'string' ? entry.id : null
      const page = findMetaPageConfig(pageId)
      for (const change of (entry.changes as Record<string, unknown>[] ?? [])) {
        if ((change as Record<string, unknown>).field !== 'leadgen') continue
        const value = (change as Record<string, unknown>).value as Record<string, unknown>
        const leadgenId = value.leadgen_id as string | undefined
        if (!leadgenId) {
          this.logger.warn('Ignoring Meta leadgen webhook without a leadgen_id')
          continue
        }

        this.logger.log(`Received Meta leadgen webhook for lead ${leadgenId}`)
        const metaLead = await this.graph.fetchLead(leadgenId, page?.accessToken)
        const importResult = await this.importer.importLead(metaLead, {
          pageId,
          pageName: page?.pageName ?? null,
          formId: typeof value.form_id === 'string' ? value.form_id : null,
          adId: typeof value.ad_id === 'string' ? value.ad_id : null,
        })

        if (importResult === 'duplicate') {
          this.logger.log(`Ignoring duplicate Meta lead ${leadgenId}`)
          continue
        }

        this.logger.log(`Created CRM lead from Meta lead ${leadgenId}`)
      }
    }

    return { ok: true }
  }
}
