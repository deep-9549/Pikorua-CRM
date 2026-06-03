function serializeProfile(profile: any) {
  if (!profile) return null

  return {
    id: profile.id,
    full_name: profile.fullName ?? profile.full_name ?? null,
    email: profile.email ?? null,
    role: profile.role ?? null,
  }
}

export function serializeCrmDetails(crm: any) {
  if (!crm) return null

  return {
    id: crm.id,
    lead_id: crm.leadId ?? crm.lead_id ?? null,
    call_status: crm.callStatus ?? crm.call_status ?? null,
    hwc: crm.hwc ?? null,
    follow_up_date: crm.followUpDate ?? crm.follow_up_date ?? null,
    buying_status: crm.buyingStatus ?? crm.buying_status ?? null,
    site_visit_status: crm.siteVisitStatus ?? crm.site_visit_status ?? null,
    budget_range: crm.budgetRange ?? crm.budget_range ?? null,
    profession: crm.profession ?? null,
    current_city: crm.currentCity ?? crm.current_city ?? null,
    current_area: crm.currentArea ?? crm.current_area ?? null,
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
  }
}
