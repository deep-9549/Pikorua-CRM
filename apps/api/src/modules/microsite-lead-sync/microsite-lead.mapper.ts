import { normalizeMetaBudget, stripPhonePrefix } from '../../common/utils/meta-format'
import { MicrositeLeadSourceConfig } from './microsite-lead-source-config'
import { MicrositeJob, MicrositeLead } from './microsite-lead.types'

function clean(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

function validDate(value: string | null | undefined): Date | null {
  const raw = clean(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function micrositeLeadFullName(lead: MicrositeLead): string | null {
  const explicitName = clean(lead.name)
  if (explicitName) return explicitName

  const joined = [clean(lead.first_name), clean(lead.last_name)]
    .filter(Boolean)
    .join(' ')
    .trim()
  return joined === '' ? null : joined
}

export function buildMicrositeLeadExternalId(
  source: MicrositeLeadSourceConfig,
  lead: MicrositeLead,
): string {
  return `${source.key}:${lead.id}`
}

export function mapMicrositeLeadToCrm(
  source: MicrositeLeadSourceConfig,
  lead: MicrositeLead,
  job: MicrositeJob | null,
) {
  const fullName = micrositeLeadFullName(lead)
  const projectName = clean(job?.property_name)
  const location = clean(job?.location)
  const receivedAt = validDate(lead.verified_at) ?? validDate(lead.created_at) ?? new Date()
  const leadSourceLabel = clean(lead.source)
  const campaignName = projectName
    ? `${source.label} - ${projectName}`
    : `${source.label} - ${leadSourceLabel ?? 'Microsite'}`
  const budgetRange = clean(lead.budget)
    ? normalizeMetaBudget(lead.budget) ?? clean(lead.budget)
    : clean(job?.price)

  const remarks = [
    clean(lead.requirement) ? `Requirement: ${clean(lead.requirement)}` : null,
    clean(lead.message),
    clean(lead.company) ? `Company: ${clean(lead.company)}` : null,
    leadSourceLabel ? `Microsite source: ${leadSourceLabel}` : null,
    clean(lead.job_id) ? `Microsite job: ${clean(lead.job_id)}` : null,
    clean(job?.firm_name) ? `Firm: ${clean(job?.firm_name)}` : null,
  ].filter(Boolean).join('\n') || null

  return {
    metaLead: {
      externalId: buildMicrositeLeadExternalId(source, lead),
      fullName,
      phone: clean(lead.phone) ? stripPhonePrefix(lead.phone) : null,
      email: clean(lead.email),
      city: location,
      campaignName,
      source: 'microsite',
      status: 'unassigned' as const,
      receivedAt,
      formData: {
        microsite_source: {
          key: source.key,
          label: source.label,
        },
        lead,
        job,
      },
    },
    crmDetails: {
      projectName,
      budgetRange,
      currentArea: location,
      companyName: clean(lead.company),
      remarks,
    },
  }
}
