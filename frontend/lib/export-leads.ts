import * as XLSX from "xlsx"

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

export function exportLeadsToExcel(leads: ExportableLead[], filename = "leads") {
  const rows = leads.map(l => ({
    "Name":          l.full_name ?? "",
    "Phone":         l.phone ?? "",
    "Email":         l.email ?? "",
    "City":          l.city ?? "",
    "Campaign":      l.campaign_name ?? "",
    "Source":        pretty(l.source),
    "Status":        pretty(l.status),
    "Assigned To":   l.assigned_to_profile?.full_name ?? "",
    "Call Status":   pretty(l.crm?.call_status),
    "HWC":           pretty(l.crm?.hwc),
    "Buying Status": pretty(l.crm?.buying_status),
    "Budget":        l.crm?.budget_range ?? "",
    "Follow-up":     fmtDate(l.crm?.follow_up_date),
    "Received":      fmtDate(l.received_at),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Leads")
  const stamp = new Date().toISOString().split("T")[0]
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`)
}
