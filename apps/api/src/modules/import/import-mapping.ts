import { BadRequestException } from '@nestjs/common'

export const IMPORT_FIELDS = [
  { key: 'full_name', label: 'Name', aliases: ['name', 'full name', 'full_name', 'lead name', 'contact name', 'name_2'] },
  { key: 'phone', label: 'Phone', required: true, aliases: ['phone', 'mobile', 'contact', 'phone number', 'phone_number', 'mobile number', 'phone_2'] },
  { key: 'email', label: 'Email', aliases: ['email', 'email address', 'e-mail', 'work email', 'note:work email'] },
  { key: 'city', label: 'Lead city', aliases: ['city', 'location', 'town', 'current city', 'current_city'] },
  { key: 'campaign_name', label: 'Campaign', aliases: ['source', 'campaign', 'campaign name', 'campaign_name', 'lead source'] },
  { key: 'platform', label: 'Platform', aliases: ['platform', 'publisher platform', 'publisher_platform', 'lead_source'] },
  { key: 'received_at', label: 'Lead received date', aliases: ['date', 'received', 'received at', 'created', 'created_time', 'created time', 'lead date', 'enquiry date'] },
  { key: 'call_status', label: 'Historical call status', aliases: ['call status', 'call_status', 'status'] },
  { key: 'hwc', label: 'Client temperature', aliases: ['client status', 'client_status', 'hwc', 'priority', 'temperature', 'lead quality'] },
  { key: 'budget_range', label: 'Budget', aliases: ['budget', 'budget range', 'budget_range', 'note:what budget range are you comfortable with?'] },
  { key: 'profession', label: 'Profession / job title', aliases: ['profession', 'occupation', 'job', 'job title', 'job_title', 'business_profile'] },
  { key: 'company_name', label: 'Company', aliases: ['company', 'company name', 'company_name', 'organisation', 'organization'] },
  { key: 'current_city', label: 'Current city', aliases: ['current city', 'current_city', 'current_city_2', 'from city'] },
  { key: 'current_area', label: 'Current area', aliases: ['current area', 'area', 'locality', 'current location', 'current_location'] },
  { key: 'follow_up_date', label: 'Follow-up date', aliases: ['follow up', 'follow up date', 'followup', 'next follow up', 'follow_up_date'] },
  { key: 'remarks', label: 'Remarks', aliases: ['remarks', 'notes', 'comments', 'additional info', 'qualitative_remarks'] },
  { key: 'first_call_date', label: 'First call date', aliases: ['first call date', 'first_call_date'] },
  { key: 'last_call_date', label: 'Latest call date', aliases: ['last call date', 'last_call_date', 'latest call date', 'latest_call_date'] },
  { key: 'buying_status', label: 'Buying status', aliases: ['buying status', 'buying_status'] },
  { key: 'site_visit_status', label: 'Visit status', aliases: ['visit status', 'visit_status', 'site visit status'] },
  { key: 'visit_date', label: 'Visit date', aliases: ['visit date', 'visit_date'] },
  { key: 'visit_confirmation_date', label: 'Visit confirmation date', aliases: ['visit confirmation date', 'visit_confirmation_date'] },
  { key: 'configuration', label: 'Configuration required', aliases: ['configuration', 'configuration required', 'configuration_required'] },
  { key: 'project_name', label: 'Project', aliases: ['project', 'project name', 'project_name'] },
  { key: 'page_name', label: 'Facebook page', aliases: ['facebook page', 'facebook_page', 'page name', 'page_name'] },
  { key: 'form_id', label: 'Facebook form ID', aliases: ['facebook form id', 'facebook_form_id', 'form id', 'form_id'] },
  { key: 'ad_id', label: 'Facebook ad ID', aliases: ['facebook ad id', 'facebook_ad_id', 'ad id', 'ad_id'] },
  { key: 'external_id', label: 'Meta lead ID', aliases: ['meta lead id', 'meta_lead_id', 'external id', 'external_id'] },
] as const

export type ImportField = typeof IMPORT_FIELDS[number]['key']
export type ImportColumnMapping = Partial<Record<ImportField, string | null>>

const CONTAINS_ALIASES: Partial<Record<ImportField, string[]>> = {
  budget_range: ['budget'],
  company_name: ['company', 'organis', 'organiz'],
  profession: ['job', 'profession', 'occupation', 'designation'],
}

export function normalizeImportHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function buildImportHeaderIndex(headers: string[], supplied?: ImportColumnMapping): ImportColumnMapping {
  const mapping: ImportColumnMapping = {}
  const normalizedHeaders = headers.map(header => ({ header, normalized: normalizeImportHeader(header) }))

  for (const field of IMPORT_FIELDS) {
    if (supplied && field.key in supplied) {
      const suppliedHeader = supplied[field.key]
      if (suppliedHeader && headers.includes(suppliedHeader)) mapping[field.key] = suppliedHeader
      continue
    }

    const aliases = field.aliases.map(normalizeImportHeader)
    // Respect alias priority, not spreadsheet column order. For example, when
    // both business_profile and job_title exist, job_title is the better match.
    const exact = aliases
      .map(alias => normalizedHeaders.find(item => item.normalized === alias))
      .find(Boolean)
    if (exact) mapping[field.key] = exact.header
  }

  for (const field of IMPORT_FIELDS) {
    if (mapping[field.key] || (supplied && field.key in supplied)) continue
    const needles = CONTAINS_ALIASES[field.key]?.map(normalizeImportHeader) ?? []
    const fallback = normalizedHeaders.find(item => needles.some(needle => item.normalized.includes(needle)))
    if (fallback) mapping[field.key] = fallback.header
  }

  return mapping
}

export function parseImportColumnMapping(raw: string | undefined, headers: string[]): ImportColumnMapping | undefined {
  if (!raw) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new BadRequestException('Column mapping must be valid JSON')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('Column mapping must be an object')
  }

  const allowedFields = new Set<string>(IMPORT_FIELDS.map(field => field.key))
  const mapping: ImportColumnMapping = {}
  for (const [field, header] of Object.entries(parsed as Record<string, unknown>)) {
    if (!allowedFields.has(field)) throw new BadRequestException(`Unknown import field: ${field}`)
    if (header === '' || header === null) {
      mapping[field as ImportField] = null
      continue
    }
    if (typeof header !== 'string' || !headers.includes(header)) {
      throw new BadRequestException(`Mapped column for ${field} was not found in the uploaded file`)
    }
    mapping[field as ImportField] = header
  }

  return mapping
}
