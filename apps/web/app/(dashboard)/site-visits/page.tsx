"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Clock, Phone, Plus, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, MapPin, User, Search,
  Mail, Briefcase, Building2, DollarSign, MessageSquare, Flame,
  Thermometer, Snowflake, ExternalLink, Download, Filter, X, Layers,
} from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getAuthUser } from "@/lib/auth/cookies"
import {
  EMPTY_SITE_VISIT_FILTERS,
  employeeOptions,
  filterSiteVisits,
  isOverdue,
  isToday,
  projectOptions,
  visitDate,
  type SiteVisitFilters,
} from "@/lib/site-visits-filter"
import { exportSiteVisitsToCsv } from "@/lib/export-site-visits"

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitCrm {
  call_status: string | null
  hwc: string | null
  follow_up_date: string | null
  project_name: string | null
  budget_range: string | null
  configuration: string[] | null
  profession: string | null
  company_name: string | null
  current_city: string | null
  current_area: string | null
  remarks: string | null
  first_call_date: string | null
  last_call_date: string | null
  buying_status: string | null
}

interface VisitRow {
  id: string
  meta_lead_id: string
  site_visit_status: "yet_to_visit" | "visit_week_confirmed" | "visit_date_confirmed" | "visited"
  visit_date: string | null
  visit_confirmation_date: string | null
  updated_at: string
  notes: string | null
  feedback: string | null
  rating: number | null
  status: "scheduled" | "completed" | "cancelled" | "no_show"
  outcome: "visit_done" | "visit_rescheduled" | "visit_cancelled" | null
  cancellation_reason: string | null
  follow_up_date: string | null
  scheduled_by_profile: { id: string; full_name: string } | null
  lead: {
    id: string
    full_name: string | null
    phone: string | null
    email: string | null
    city: string | null
    campaign_name: string | null
    source: string | null
    assigned_to_profile: { id: string; full_name: string } | null
    crm?: VisitCrm | null
  }
}

interface LeadOption {
  id: string
  full_name: string | null
  phone: string | null
}

const STATUS_META: Record<VisitRow["site_visit_status"], { label: string; color: string; bg: string }> = {
  yet_to_visit:           { label: "Yet to Visit",           color: "oklch(0.55 0.08 260)",  bg: "oklch(0.55 0.08 260 / 0.15)" },
  visit_week_confirmed:   { label: "Week Confirmed",         color: "oklch(0.78 0.15 65)",   bg: "oklch(0.78 0.15 65 / 0.15)" },
  visit_date_confirmed:   { label: "Date Confirmed",         color: "oklch(0.65 0.15 145)",  bg: "oklch(0.65 0.15 145 / 0.15)" },
  visited:                { label: "Visited",                color: "oklch(0.65 0.15 145)",  bg: "oklch(0.65 0.15 145 / 0.15)" },
}

const HWC_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hot:  { label: "Hot",  icon: Flame,       color: "oklch(0.75 0.18 35)" },
  warm: { label: "Warm", icon: Thermometer, color: "oklch(0.78 0.15 65)" },
  cold: { label: "Cold", icon: Snowflake,   color: "oklch(0.65 0.15 250)" },
}

const CALL_STATUS_COLORS: Record<string, string> = {
  spoken:         "oklch(0.65 0.15 145)",
  not_spoken:     "var(--color-destructive)",
  call_back_later:"var(--color-primary)",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function fmtDateTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function FilterSelect({ value, onChange, children }: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 w-full rounded-lg px-2.5 text-xs bg-transparent cursor-pointer sm:w-auto sm:max-w-[180px]"
      style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
    >
      {children}
    </select>
  )
}

function toDateTimeLocal(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ""
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

// ─── Visit Detail Dialog ──────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: "var(--color-muted, oklch(0.96 0 0))" }}>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-muted-foreground)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide mb-0.5" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
        <div className="text-sm" style={{ color: "var(--color-foreground)" }}>{value}</div>
      </div>
    </div>
  )
}

function VisitDetailDialog({ visit, onClose, onUpdateOutcome }: { visit: VisitRow | null; onClose: () => void; onUpdateOutcome: (visit: VisitRow) => void }) {
  if (!visit) return null
  const lead = visit.lead
  const crm = lead.crm
  const meta = STATUS_META[visit.site_visit_status]
  const overdue = isOverdue(visit)
  const canUpdateOutcome = overdue || visit.status !== "scheduled" || visit.outcome !== null
  const when = visit.visit_date ?? visit.visit_confirmation_date
  const hwcMeta = crm?.hwc ? HWC_META[crm.hwc] : null
  const HwcIcon = hwcMeta?.icon

  const callStatusLabel: Record<string, string> = {
    spoken: "Spoken",
    not_spoken: "Not Spoken",
    call_back_later: "Call Back Later",
  }
  const buyingStatusLabel: Record<string, string> = {
    ready: "Ready to Buy",
    still_searching: "Still Searching",
    postponed: "Postponed",
  }

  return (
    <Dialog open={!!visit} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs gold-gradient" style={{ color: "var(--color-primary-foreground)" }}>
                {initials(lead.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-base font-semibold truncate">{lead.full_name ?? "Unknown"}</p>
              {lead.campaign_name && (
                <p className="text-xs font-normal truncate" style={{ color: "var(--color-primary)" }}>{lead.campaign_name}</p>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Site visit details for {lead.full_name}</DialogDescription>
        </DialogHeader>

        {/* Visit status banner */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: meta.bg, border: `1px solid ${meta.color}40` }}>
          <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
          {overdue && (
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--color-destructive)" }}>
              <AlertCircle className="w-3 h-3" />Overdue
            </span>
          )}
          {when && (
            <span className="flex items-center gap-1 text-[11px] ml-auto" style={{ color: overdue ? "var(--color-destructive)" : "var(--color-foreground)" }}>
              <Clock className="w-3 h-3" />{fmtDateTime(when)}
            </span>
          )}
        </div>

        <div className="space-y-4 mt-1">
          {/* Contact info */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-muted-foreground)" }}>Contact</p>
            <DetailRow icon={Phone} label="Phone" value={lead.phone ? (
              <ProtectedPhone value={lead.phone} className="text-sm" style={{ color: "var(--color-foreground)" }}>
                {formatPhone(lead.phone)}
              </ProtectedPhone>
            ) : null} />
            <DetailRow icon={Mail} label="Email" value={lead.email} />
            <DetailRow icon={MapPin} label="City" value={lead.city} />
          </div>

          {crm && (
            <>
              {/* Call info */}
              <div className="space-y-3" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-muted-foreground)" }}>Call Info</p>
                {crm.call_status && (
                  <DetailRow icon={Phone} label="Call Status" value={
                    <span style={{ color: CALL_STATUS_COLORS[crm.call_status] ?? "var(--color-foreground)" }}>
                      {callStatusLabel[crm.call_status] ?? crm.call_status}
                    </span>
                  } />
                )}
                {crm.hwc && hwcMeta && HwcIcon && (
                  <DetailRow icon={HwcIcon} label="HWC" value={
                    <span style={{ color: hwcMeta.color }}>{hwcMeta.label}</span>
                  } />
                )}
                <DetailRow icon={Calendar} label="First Call" value={fmtDate(crm.first_call_date)} />
                <DetailRow icon={Calendar} label="Last Call" value={fmtDate(crm.last_call_date)} />
                <DetailRow icon={Calendar} label="Follow-up Date" value={fmtDate(crm.follow_up_date)} />
                {crm.buying_status && (
                  <DetailRow icon={CheckCircle2} label="Buying Status" value={buyingStatusLabel[crm.buying_status] ?? crm.buying_status} />
                )}
              </div>

              {/* Property preferences */}
              {(crm.project_name || crm.budget_range || crm.configuration?.length) && (
                <div className="space-y-3" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                  <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-muted-foreground)" }}>Preferences</p>
                  <DetailRow icon={Building2} label="Project Name" value={crm.project_name} />
                  <DetailRow icon={DollarSign} label="Budget" value={crm.budget_range} />
                  {crm.configuration && crm.configuration.length > 0 && (
                    <DetailRow icon={Building2} label="Configuration" value={
                      <div className="flex flex-wrap gap-1">
                        {crm.configuration.map(c => (
                          <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                        ))}
                      </div>
                    } />
                  )}
                </div>
              )}

              {/* Background */}
              {(crm.profession || crm.company_name || crm.current_city || crm.current_area) && (
                <div className="space-y-3" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                  <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-muted-foreground)" }}>Background</p>
                  <DetailRow icon={Briefcase} label="Profession" value={crm.profession} />
                  <DetailRow icon={Building2} label="Company" value={crm.company_name} />
                  <DetailRow icon={MapPin} label="Current City" value={crm.current_city} />
                  <DetailRow icon={MapPin} label="Current Area" value={crm.current_area} />
                </div>
              )}

              {crm.remarks && (
                <div className="space-y-3" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                  <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-muted-foreground)" }}>Remarks</p>
                  <DetailRow icon={MessageSquare} label="Notes" value={crm.remarks} />
                </div>
              )}
            </>
          )}

          {/* Visit metadata */}
          <div className="space-y-3" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
            <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-muted-foreground)" }}>Visit Info</p>
            {visit.scheduled_by_profile && (
              <DetailRow icon={User} label="Scheduled By" value={visit.scheduled_by_profile.full_name} />
            )}
            {lead.assigned_to_profile && (
              <DetailRow icon={User} label="Assigned To" value={lead.assigned_to_profile.full_name} />
            )}
            {visit.notes && <DetailRow icon={MessageSquare} label="Notes" value={visit.notes} />}
            {visit.feedback && <DetailRow icon={MessageSquare} label="Feedback" value={visit.feedback} />}
            {visit.cancellation_reason && <DetailRow icon={AlertCircle} label="Cancellation Reason" value={visit.cancellation_reason} />}
            {visit.follow_up_date && <DetailRow icon={Calendar} label="Follow-up Date" value={fmtDate(visit.follow_up_date)} />}
            {visit.rating != null && (
              <DetailRow icon={CheckCircle2} label="Rating" value={`${visit.rating} / 5`} />
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button variant="outline" className="w-full mb-2" asChild>
            <Link href={`/leads/${lead.id}`}>
              <ExternalLink className="w-4 h-4 mr-2" />Open Lead
            </Link>
          </Button>
          {canUpdateOutcome && (
            <Button className="w-full mb-2 gold-gradient" onClick={() => onUpdateOutcome(visit)}>
              {visit.outcome ? "Edit Visit Outcome" : "Update Visit Outcome"}
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function VisitOutcomeDialog({ visit, onClose, onSaved }: { visit: VisitRow | null; onClose: () => void; onSaved: () => void }) {
  const [outcome, setOutcome] = useState<"visit_done" | "visit_rescheduled" | "visit_cancelled">("visit_done")
  const [remarks, setRemarks] = useState("")
  const [rescheduledDate, setRescheduledDate] = useState("")
  const [cancellationReason, setCancellationReason] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visit) return
    const savedOutcome = visit.outcome
      ?? (visit.status === "cancelled" ? "visit_cancelled" : "visit_done")
    setOutcome(savedOutcome)
    setRemarks(visit.feedback ?? "")
    setRescheduledDate(savedOutcome === "visit_rescheduled" ? toDateTimeLocal(visit.visit_confirmation_date) : "")
    setCancellationReason(visit.cancellation_reason ?? "")
    setFollowUpDate(toDateTimeLocal(visit.follow_up_date))
    setError(null)
  }, [visit])

  async function saveOutcome() {
    if (outcome === 'visit_done' && !remarks.trim()) return setError('Add visit remarks')
    if (outcome === 'visit_rescheduled' && !rescheduledDate) return setError('Choose the rescheduled date and time')
    if (outcome === 'visit_cancelled' && !cancellationReason.trim()) return setError('Add a cancellation reason')
    if (!followUpDate) return setError('Choose a follow-up date')
    setSaving(true); setError(null)
    try {
      const body: Record<string, string> = { outcome, follow_up_date: new Date(followUpDate).toISOString() }
      if (outcome === 'visit_done') body.feedback = remarks
      if (outcome === 'visit_rescheduled') body.rescheduled_date = new Date(rescheduledDate).toISOString()
      if (outcome === 'visit_cancelled') body.cancellation_reason = cancellationReason
      const res = await fetch(`/api/site-visits/${visit?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? 'Failed to update visit')
      onSaved(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update visit') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={!!visit} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{visit?.outcome ? "Edit Site Visit Outcome" : "Update Site Visit Outcome"}</DialogTitle><DialogDescription>{visit?.lead.full_name ?? 'Lead'} · save an outcome or overwrite the existing one to correct a mistake.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Outcome</Label>
            <SearchableSelect
              value={outcome}
              onValueChange={v => setOutcome(v as typeof outcome)}
              options={[
                { value: "visit_done", label: "Visit Done" },
                { value: "visit_rescheduled", label: "Visit Rescheduled" },
                { value: "visit_cancelled", label: "Visit Cancelled" },
              ]}
              searchPlaceholder="Search outcome..."
            />
          </div>
          {outcome === 'visit_done' && <div className="space-y-1.5"><Label>Visit Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Customer response, project feedback..." /></div>}
          {outcome === 'visit_rescheduled' && <div className="space-y-1.5"><Label>Rescheduled Date & Time</Label><Input type="datetime-local" value={rescheduledDate} onChange={e => setRescheduledDate(e.target.value)} /></div>}
          {outcome === 'visit_cancelled' && <div className="space-y-1.5"><Label>Cancellation Reason</Label><Textarea value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} /></div>}
          <div className="space-y-1.5"><Label>Follow-up Date</Label><Input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} /></div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button><Button className="flex-1 gold-gradient" disabled={saving} onClick={saveOutcome}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : visit?.outcome ? 'Overwrite Outcome' : 'Save Outcome'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Schedule Visit Dialog ────────────────────────────────────────────────────

function ScheduleVisitDialog({
  open, onClose, onSaved,
}: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [leadSearch, setLeadSearch] = useState("")
  const [leadId, setLeadId] = useState<string>("")
  const [status, setStatus] = useState<VisitRow["site_visit_status"]>("visit_date_confirmed")
  const [visitDate, setVisitDate] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLeadSearch(""); setLeadId(""); setStatus("visit_date_confirmed"); setVisitDate(""); setError(null)
    fetch("/api/leads/meta").then(r => r.json()).then(json => {
      const list: LeadOption[] = (json.leads ?? []).map((l: LeadOption) => ({
        id: l.id, full_name: l.full_name, phone: l.phone,
      }))
      setLeads(list)
    }).catch(() => setLeads([]))
  }, [open])

  const filteredLeads = useMemo(() => {
    if (!leadSearch) return leads.slice(0, 50)
    const q = leadSearch.toLowerCase()
    return leads.filter(l =>
      l.full_name?.toLowerCase().includes(q) || l.phone?.toLowerCase().includes(q)
    ).slice(0, 50)
  }, [leads, leadSearch])

  const needsDate = status === "visit_date_confirmed" || status === "visited"

  async function handleSave() {
    if (!leadId) { setError("Select a lead"); return }
    if (needsDate && !visitDate) { setError("Pick a date & time"); return }
    setSaving(true); setError(null)

    const body: Record<string, unknown> = {
      lead_id: leadId,
      site_visit_status: status,
    }
    if (needsDate) {
      const iso = new Date(visitDate).toISOString()
      if (status === "visited") body.visit_date = iso
      else                       body.visit_confirmation_date = iso
    }

    try {
      const res = await fetch("/api/site-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to save")
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            Schedule Site Visit
          </DialogTitle>
          <DialogDescription>
            Pick a lead and lock in when they are visiting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Lead</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-muted-foreground)" }} />
              <Input
                placeholder="Search name or phone..."
                value={leadSearch}
                onChange={e => { setLeadSearch(e.target.value); setLeadId("") }}
                className="h-9 pl-8 text-sm"
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--color-border)" }}>
              {filteredLeads.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--color-muted-foreground)" }}>No leads</p>
              ) : (
                filteredLeads.map(l => (
                  <button key={l.id} type="button"
                    onClick={() => setLeadId(l.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={leadId === l.id ? { background: "rgb(194 65 12 / 0.12)" } : { background: "transparent" }}>
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[9px]">{initials(l.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--color-foreground)" }}>
                        {l.full_name ?? "Unknown"}
                      </p>
                      {l.phone && (
                        <ProtectedPhone value={l.phone} className="block text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                          {formatPhone(l.phone)}
                        </ProtectedPhone>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Visit Status</Label>
            <SearchableSelect
              value={status}
              onValueChange={v => setStatus(v as VisitRow["site_visit_status"])}
              options={[
                { value: "yet_to_visit", label: "Yet to Visit" },
                { value: "visit_week_confirmed", label: "Visit Week Confirmed" },
                { value: "visit_date_confirmed", label: "Visit Date Confirmed" },
                { value: "visited", label: "Visited" },
              ]}
              searchPlaceholder="Search visit status..."
              triggerClassName="h-9 text-sm"
            />
          </div>

          {needsDate && (
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
                {status === "visited" ? "Visit Date & Time" : "Confirmation Date & Time"}
              </Label>
              <input
                type="datetime-local"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm bg-transparent"
                style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: "rgb(185 28 28 / 0.12)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.3)" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="flex-1 h-9 gold-gradient font-semibold shadow-gold-sm"
              style={{ color: "var(--color-primary-foreground)" }}>
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                : <><Calendar className="w-4 h-4 mr-2" />Schedule</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Visit Card ───────────────────────────────────────────────────────────────

function VisitCard({ v, showOwner, onClick }: { v: VisitRow; showOwner: boolean; onClick: () => void }) {
  const meta = STATUS_META[v.site_visit_status]
  const overdue = isOverdue(v)
  const when = v.visit_date ?? v.visit_confirmation_date
  const whenLabel = fmtDateTime(when)
  const scheduledBy = v.scheduled_by_profile?.full_name
  const owner = v.lead.assigned_to_profile?.full_name
  const showOwnerLine = showOwner && owner && owner !== scheduledBy

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-150 hover:scale-[1.005] cursor-pointer"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="text-xs gold-gradient" style={{ color: "var(--color-primary-foreground)" }}>
          {initials(v.lead.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-foreground)" }}>
            {v.lead.full_name ?? "Unknown"}
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}40` }}>
            {meta.label}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: "var(--color-destructive)", background: "rgb(185 28 28 / 0.12)", border: "1px solid rgb(185 28 28 / 0.3)" }}>
              <AlertCircle className="w-2.5 h-2.5" />Overdue
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {v.lead.phone && (
            <ProtectedPhone value={v.lead.phone} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <Phone className="w-3 h-3" />{formatPhone(v.lead.phone)}
            </ProtectedPhone>
          )}
          {v.lead.city && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <MapPin className="w-3 h-3" />{v.lead.city}
            </span>
          )}
          {scheduledBy && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <User className="w-3 h-3" />Scheduled by {scheduledBy}
            </span>
          )}
        </div>
        {showOwnerLine && (
          <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.65 0.15 145)" }}>
            Owned by {owner}
          </p>
        )}
      </div>

      {whenLabel && (
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-medium"
            style={{ color: overdue ? "var(--color-destructive)" : "var(--color-foreground)" }}>
            <Clock className="w-3.5 h-3.5" />{whenLabel}
          </div>
        </div>
      )}
    </motion.button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type VisitTab = "upcoming" | "past" | "all"

export default function SiteVisitsPage() {
  const [tab, setTab] = useState<VisitTab>("upcoming")
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null)
  const [outcomeVisit, setOutcomeVisit] = useState<VisitRow | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<SiteVisitFilters>({ ...EMPTY_SITE_VISIT_FILTERS })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("quickAdd") === "visit") {
      setDialogOpen(true)
    }
  }, [])

  useEffect(() => {
    const user = getAuthUser()
    if (user) {
      setIsSuperAdmin(user.role === "super_admin")
    }
  }, [])

  const fetchVisits = useCallback(async (which: VisitTab) => {
    setLoading(true); setError(null)
    try {
      // The API returns every visit when no status is given — that's the All tab.
      const res = await fetch(which === "all" ? "/api/site-visits" : `/api/site-visits?status=${which}`)
      if (!res.ok) throw new Error("Failed to load visits")
      const json = await res.json()
      setVisits(json.visits ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVisits(tab) }, [tab, fetchVisits])

  const projects = useMemo(() => projectOptions(visits), [visits])
  const employees = useMemo(() => employeeOptions(visits), [visits])

  const visibleVisits = useMemo(
    () => filterSiteVisits(visits, search, filters),
    [visits, search, filters],
  )

  function setFilter<K extends keyof SiteVisitFilters>(key: K, value: SiteVisitFilters[K]) {
    // "On" and the date range answer the same question two ways, so setting
    // either one clears the other.
    setFilters(p => {
      const next = { ...p, [key]: value }
      if (value) {
        if (key === "dateOn") { next.dateFrom = ""; next.dateTo = "" }
        if (key === "dateFrom" || key === "dateTo") next.dateOn = ""
      }
      return next
    })
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const handleExport = useCallback(() => {
    if (!isSuperAdmin) return
    exportSiteVisitsToCsv(visibleVisits)
  }, [isSuperAdmin, visibleVisits])

  const counts = useMemo(() => ({
    total: visibleVisits.length,
    today: visibleVisits.filter(v => isToday(visitDate(v))).length,
    overdue: visibleVisits.filter(v => isOverdue(v)).length,
  }), [visibleVisits])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Site Visits
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {isSuperAdmin ? "All site visits across the team" : "Your scheduled and past site visits"}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchVisits(tab)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={visibleVisits.length === 0}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          <Button size="sm"
            className="gap-2 gold-gradient font-semibold shadow-gold-sm"
            style={{ color: "var(--color-primary-foreground)" }}
            onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Schedule Visit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: tab === "upcoming" ? "Upcoming" : tab === "past" ? "Past" : "All Visits", value: counts.total, icon: Calendar, color: "var(--color-primary)" },
          { label: "Today",   value: counts.today,   icon: Clock,        color: "var(--color-warning)" },
          { label: "Overdue", value: counts.overdue, icon: AlertCircle,  color: "var(--color-destructive)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-xl font-bold sm:text-2xl" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as VisitTab)}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />Past
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" />All
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + filter toggle */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
          <Input placeholder="Search client, project or scheduler..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto sm:shrink-0" onClick={() => setShowFilters(p => !p)}>
          <Filter className="w-4 h-4" /> Filters
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 rounded-full"
              style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}>
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="grid grid-cols-1 gap-2 rounded-xl p-3 sm:flex sm:flex-wrap sm:items-center"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <FilterSelect value={filters.status} onChange={v => setFilter("status", v)}>
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </FilterSelect>
              <FilterSelect value={filters.outcome} onChange={v => setFilter("outcome", v)}>
                <option value="">All Outcomes</option>
                <option value="visit_done">Visit Done</option>
                <option value="visit_rescheduled">Rescheduled</option>
                <option value="visit_cancelled">Cancelled</option>
              </FilterSelect>
              <FilterSelect value={filters.timing} onChange={v => setFilter("timing", v as SiteVisitFilters["timing"])}>
                <option value="">Any Time</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this_week">Next 7 Days</option>
                <option value="overdue">Overdue</option>
              </FilterSelect>
              {projects.length > 0 && (
                <FilterSelect value={filters.project} onChange={v => setFilter("project", v)}>
                  <option value="">All Projects</option>
                  {projects.map(project => <option key={project} value={project}>{project}</option>)}
                </FilterSelect>
              )}
              {isSuperAdmin && employees.length > 0 && (
                <FilterSelect value={filters.employee} onChange={v => setFilter("employee", v)}>
                  <option value="">All Employees</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </FilterSelect>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] shrink-0" style={{ color: "var(--color-muted-foreground)" }}>On</span>
                <input type="date" value={filters.dateOn} onChange={e => setFilter("dateOn", e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:flex">
                <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>From</span>
                <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={e => setFilter("dateFrom", e.target.value)}
                  className="h-9 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
                <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>to</span>
                <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={e => setFilter("dateTo", e.target.value)}
                  className="h-9 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-1 h-9 text-xs" onClick={() => setFilters({ ...EMPTY_SITE_VISIT_FILTERS })}>
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgb(185 28 28 / 0.12)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.25)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : visibleVisits.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Calendar className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            {visits.length > 0
              ? "No visits match these filters"
              : tab === "upcoming" ? "No upcoming visits" : tab === "past" ? "No past visits" : "No visits yet"}
          </p>
          {visits.length > 0 ? (
            <Button size="sm" variant="outline" className="gap-2 mx-auto"
              onClick={() => { setSearch(""); setFilters({ ...EMPTY_SITE_VISIT_FILTERS }) }}>
              <X className="w-3.5 h-3.5" />Clear filters
            </Button>
          ) : tab === "upcoming" && (
            <Button size="sm" variant="outline" className="gap-2 mx-auto" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5" />Schedule one
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-2">
            {visibleVisits.map(v => (
              <VisitCard
                key={v.id}
                v={v}
                showOwner={isSuperAdmin}
                onClick={() => setSelectedVisit(v)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <ScheduleVisitDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => fetchVisits(tab)}
      />

      <VisitDetailDialog
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onUpdateOutcome={visit => setOutcomeVisit(visit)}
      />
      <VisitOutcomeDialog visit={outcomeVisit} onClose={() => setOutcomeVisit(null)} onSaved={() => { setSelectedVisit(null); fetchVisits(tab) }} />
    </div>
  )
}
