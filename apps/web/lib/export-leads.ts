export interface ExportableLead {
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: string
  received_at: string
  assigned_to_profile?: { full_name: string } | null
  crm?: {
    call_status?: string | null
    hwc?: string | null
    follow_up_date?: string | null
    buying_status?: string | null
    budget_range?: string | null
    profession?: string | null
    company_name?: string | null
    current_city?: string | null
    current_area?: string | null
  } | null
}

function pretty(v: string | null | undefined) {
  if (!v) return ""
  return v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(v: string | null | undefined) {
  if (!v) return ""
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
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
    "Assigned To",
    "Call Status",
    "HWC",
    "Buying Status",
    "Budget",
    "Profession",
    "Company",
    "Current City",
    "Current Area",
    "Follow-up",
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
    l.assigned_to_profile?.full_name ?? "",
    pretty(l.crm?.call_status),
    pretty(l.crm?.hwc),
    pretty(l.crm?.buying_status),
    l.crm?.budget_range ?? "",
    l.crm?.profession ?? "",
    l.crm?.company_name ?? "",
    l.crm?.current_city ?? "",
    l.crm?.current_area ?? "",
    fmtDate(l.crm?.follow_up_date),
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
