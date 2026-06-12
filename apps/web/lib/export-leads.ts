export interface ExportableLead {
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: string
  received_at: string
  client_status?: string | null
  client_status_note?: string | null
  assigned_to_profile?: { full_name: string } | null
  crm?: {
    first_call_date?: string | null
    last_call_date?: string | null
    call_status?: string | null
    hwc?: string | null
    follow_up_date?: string | null
    buying_status?: string | null
    site_visit_status?: string | null
    visit_date?: string | null
    visit_confirmation_date?: string | null
    budget_range?: string | null
    configuration?: string[] | null
    profession?: string | null
    company_name?: string | null
    current_city?: string | null
    current_area?: string | null
    remarks?: string | null
    updated_at?: string | null
  } | null
}

function pretty(v: string | null | undefined) {
  if (!v) return ""
  return v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

const CLIENT_DETAIL_STATUSES = new Set([
  "hot",
  "warm",
  "cold",
  "lost",
  "low_budget",
  "not_interested",
  "broker",
  "construction_biz_owner",
])

function prettyClientStatus(v: string | null | undefined) {
  return v && CLIENT_DETAIL_STATUSES.has(v) ? pretty(v) : ""
}

function fmtDate(v: string | null | undefined) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function fmtDateTime(v: string | null | undefined) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function joinList(v: string[] | null | undefined) {
  return Array.isArray(v) ? v.join(", ") : ""
}

function escapeCsv(value: string) {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`
  }
  return value
}

export function exportLeadsToExcel(leads: ExportableLead[], filename = "leads") {
  const columns = [
    "Name",
    "Phone",
    "Email",
    "City",
    "Campaign",
    "Source",
    "Status",
    "Client Status",
    "Client Status Note",
    "Assigned To",
    "Call Status",
    "First Call Date",
    "Last Call Date",
    "HWC",
    "Follow-up",
    "Buying Status",
    "Site Visit Status",
    "Visit Date",
    "Visit Confirmation Date",
    "Budget",
    "Configuration Needed",
    "Profession",
    "Company",
    "Current City",
    "Current Area",
    "Qualitative Remarks",
    "CRM Updated",
    "Received",
  ]

  const rows = leads.map(l => [
    l.full_name ?? "",
    l.phone ?? "",
    l.email ?? "",
    l.city ?? "",
    l.campaign_name ?? "",
    pretty(l.source),
    pretty(l.status),
    prettyClientStatus(l.client_status),
    l.client_status_note ?? "",
    l.assigned_to_profile?.full_name ?? "",
    pretty(l.crm?.call_status),
    fmtDate(l.crm?.first_call_date),
    fmtDate(l.crm?.last_call_date),
    pretty(l.crm?.hwc),
    fmtDate(l.crm?.follow_up_date),
    pretty(l.crm?.buying_status),
    pretty(l.crm?.site_visit_status),
    fmtDateTime(l.crm?.visit_date),
    fmtDateTime(l.crm?.visit_confirmation_date),
    l.crm?.budget_range ?? "",
    joinList(l.crm?.configuration),
    l.crm?.profession ?? "",
    l.crm?.company_name ?? "",
    l.crm?.current_city ?? "",
    l.crm?.current_area ?? "",
    l.crm?.remarks ?? "",
    fmtDateTime(l.crm?.updated_at),
    fmtDate(l.received_at),
  ])

  const lines = [
    columns.join(","),
    ...rows.map(row => row.map(cell => escapeCsv(String(cell))).join(",")),
  ]

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const stamp = new Date().toISOString().split("T")[0]
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
