import { serializeProfile } from '../../common/serializers/profile.serializer'

// DB enum → UI value mappings (reverse of what LeadsService.update writes)
const SITE_VISIT_DB_TO_UI: Record<string, string> = {
  not_scheduled: 'yet_to_visit',
  scheduled: 'visit_date_confirmed',
  completed: 'visited',
}
const BUYING_DB_TO_UI: Record<string, string> = {
  exploring: 'still_searching',
  not_ready: 'postponed',
  ready: 'ready',
  interested: 'interested',
}

export function serializeCrmDetails(crm: any) {
  if (!crm) return null

  const rawSiteVisit = crm.siteVisitStatus ?? crm.site_visit_status ?? null
  const rawBuying = crm.buyingStatus ?? crm.buying_status ?? null

  return {
    id: crm.id,
    lead_id: crm.leadId ?? crm.lead_id ?? null,
    call_status: crm.callStatus ?? crm.call_status ?? null,
    not_spoken_reason: crm.notSpokenReason ?? crm.not_spoken_reason ?? null,
    first_call_date: crm.firstCallDate ?? crm.first_call_date ?? null,
    last_call_date: crm.lastCallDate ?? crm.last_call_date ?? null,
    hwc: crm.hwc ?? null,
    follow_up_date: crm.followUpDate ?? crm.follow_up_date ?? null,
    follow_up_done: crm.followUpDone ?? crm.follow_up_done ?? false,
    follow_up_remarks: crm.followUpRemarks ?? crm.follow_up_remarks ?? null,
    buying_status: rawBuying ? (BUYING_DB_TO_UI[rawBuying] ?? rawBuying) : null,
    site_visit_status: rawSiteVisit ? (SITE_VISIT_DB_TO_UI[rawSiteVisit] ?? rawSiteVisit) : null,
    visit_date: crm.visitDate ?? crm.visit_date ?? null,
    visit_confirmation_date: crm.visitConfirmationDate ?? crm.visit_confirmation_date ?? null,
    project_name: crm.projectName ?? crm.project_name ?? null,
    budget_range: crm.budgetRange ?? crm.budget_range ?? null,
    configuration: crm.configuration ?? null,
    profession: crm.profession ?? null,
    company_name: crm.companyName ?? crm.company_name ?? null,
    current_city: crm.currentCity ?? crm.current_city ?? null,
    current_area: crm.currentArea ?? crm.current_area ?? null,
    remarks: crm.remarks ?? null,
    updated_at: crm.updatedAt ?? crm.updated_at ?? null,
  }
}

export function serializeMetaLead(lead: any) {
  if (!lead) return null

  return {
    id: lead.id,
    form_id: lead.formId ?? null,
    ad_id: lead.adId ?? null,
    campaign_name: lead.campaignName ?? null,
    full_name: lead.fullName ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    city: lead.city ?? null,
    source: lead.source === 'meta_ads' ? 'meta_ad' : lead.source,
    status: lead.status,
    form_data: lead.formData ?? null,
    client_id: lead.clientId ?? null,
    assigned_to: lead.assignedTo ?? null,
    assigned_by: lead.assignedBy ?? null,
    assigned_at: lead.assignedAt ?? null,
    received_at: lead.receivedAt,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
    assigned_to_profile: serializeProfile(lead.assignedToProfile),
    assigned_by_profile: serializeProfile(lead.assignedByProfile),
    crm: serializeCrmDetails(lead.crmDetails),
    client_status: lead.clientStatus ?? null,
    client_status_note: lead.clientStatusNote ?? null,
  }
}
