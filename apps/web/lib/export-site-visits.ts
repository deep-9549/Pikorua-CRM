export interface ExportableSiteVisit {
  site_visit_status: string
  visit_date: string | null
  visit_confirmation_date: string | null
  status: string
  outcome: string | null
  cancellation_reason: string | null
  follow_up_date: string | null
  feedback: string | null
  rating: number | null
  notes: string | null
  created_at?: string | null
  scheduled_by_profile: { id: string; full_name: string } | null
  lead: {
    full_name: string | null
    phone: string | null
    email: string | null
    city: string | null
    campaign_name: string | null
    source: string | null
    assigned_to_profile: { id: string; full_name: string } | null
    crm?: {
      project_name?: string | null
      budget_range?: string | null
      hwc?: string | null
      call_status?: string | null
    } | null
  }
}

function pretty(v: string | null | undefined) {
  if (!v) return ""
  return v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(v: string | null | undefined) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function fmtTime(v: string | null | undefined) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
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

function escapeCsv(value: string) {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`
  }
  return value
}

export function buildSiteVisitsCsv(visits: ExportableSiteVisit[]) {
  const columns = [
    "Client Name",
    "Phone",
    "Email",
    "City",
    "Project",
    "Visit Date",
    "Visit Time",
    "Visit Stage",
    "Visit Status",
    "Outcome",
    "Cancellation Reason",
    "Follow-up Date",
    "Feedback",
    "Rating",
    "Scheduled By",
    "Lead Owner",
    "Source",
    "Campaign",
    "Budget",
    "HWC",
    "Call Status",
    "Notes",
    "Created At",
  ]

  const rows = visits.map(visit => {
    const when = visit.visit_date ?? visit.visit_confirmation_date
    const crm = visit.lead.crm
    return [
      visit.lead.full_name ?? "",
      visit.lead.phone ?? "",
      visit.lead.email ?? "",
      visit.lead.city ?? "",
      crm?.project_name ?? "",
      fmtDate(when),
      fmtTime(when),
      pretty(visit.site_visit_status),
      pretty(visit.status),
      pretty(visit.outcome),
      visit.cancellation_reason ?? "",
      fmtDate(visit.follow_up_date),
      visit.feedback ?? "",
      visit.rating == null ? "" : String(visit.rating),
      visit.scheduled_by_profile?.full_name ?? "",
      visit.lead.assigned_to_profile?.full_name ?? "",
      pretty(visit.lead.source),
      visit.lead.campaign_name ?? "",
      crm?.budget_range ?? "",
      pretty(crm?.hwc),
      pretty(crm?.call_status),
      visit.notes ?? "",
      fmtDateTime(visit.created_at),
    ].map(cell => escapeCsv(String(cell)))
  })

  return [columns.map(escapeCsv).join(","), ...rows.map(row => row.join(","))].join("\n")
}

export function exportSiteVisitsToCsv(
  visits: ExportableSiteVisit[],
  filename = "pikorua-site-visits",
) {
  // The BOM makes Excel read the file as UTF-8, so non-ASCII names survive.
  const blob = new Blob([`﻿${buildSiteVisitsCsv(visits)}`], { type: "text/csv;charset=utf-8;" })
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
