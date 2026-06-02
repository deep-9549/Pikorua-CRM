"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Clock, Phone, Plus, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, MapPin, User, Search, X
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { getAuthUser } from "@/lib/auth/cookies"

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitRow {
  meta_lead_id: string
  site_visit_status: "yet_to_visit" | "visit_week_confirmed" | "visit_date_confirmed" | "visited"
  visit_date: string | null
  visit_confirmation_date: string | null
  updated_at: string
  scheduled_by_profile: { id: string; full_name: string } | null
  lead: {
    id: string
    full_name: string | null
    phone: string | null
    email: string | null
    city: string | null
    campaign_name: string | null
    assigned_to_profile: { id: string; full_name: string } | null
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

function isOverdue(v: VisitRow) {
  if (v.site_visit_status !== "visit_date_confirmed") return false
  if (!v.visit_date) return false
  return new Date(v.visit_date).getTime() < Date.now()
}

function isToday(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

// Convert ISO -> "YYYY-MM-DDTHH:MM" for datetime-local
function isoToLocalInput(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
    // Fetch leads the user can see
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
      // For "visited" we store in visit_date; for "visit_date_confirmed" we use visit_confirmation_date.
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
          {/* Lead search + pick */}
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
                <p className="text-xs text-center py-4" style={{ color: "var(--color-muted-foreground)" }}>
                  No leads
                </p>
              ) : (
                filteredLeads.map(l => (
                  <button key={l.id} type="button"
                    onClick={() => setLeadId(l.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={leadId === l.id
                      ? { background: "rgb(194 65 12 / 0.12)" }
                      : { background: "transparent" }}>
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[9px]">{initials(l.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--color-foreground)" }}>
                        {l.full_name ?? "Unknown"}
                      </p>
                      {l.phone && (
                        <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{l.phone}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Visit Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as VisitRow["site_visit_status"])}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yet_to_visit">Yet to Visit</SelectItem>
                <SelectItem value="visit_week_confirmed">Visit Week Confirmed</SelectItem>
                <SelectItem value="visit_date_confirmed">Visit Date Confirmed</SelectItem>
                <SelectItem value="visited">Visited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datetime when applicable */}
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

function VisitCard({ v, showOwner }: { v: VisitRow; showOwner: boolean }) {
  const meta = STATUS_META[v.site_visit_status]
  const overdue = isOverdue(v)
  const when = v.visit_date ?? v.visit_confirmation_date
  const whenLabel = fmtDateTime(when)
  const scheduledBy = v.scheduled_by_profile?.full_name
  const owner = v.lead.assigned_to_profile?.full_name
  const showOwnerLine = showOwner && owner && owner !== scheduledBy

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl"
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
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <Phone className="w-3 h-3" />{v.lead.phone}
            </span>
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
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiteVisitsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Determine current user's role for "Owned by" line visibility
  useEffect(() => {
    const user = getAuthUser()
    if (user) {
      setIsSuperAdmin(user.role === "super_admin")
    }
  }, [])

  const fetchVisits = useCallback(async (which: "upcoming" | "past") => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/site-visits?status=${which}`)
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

  const counts = useMemo(() => ({
    total: visits.length,
    today: visits.filter(v => isToday(v.visit_date ?? v.visit_confirmation_date)).length,
    overdue: visits.filter(isOverdue).length,
  }), [visits])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Site Visits
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {isSuperAdmin ? "All site visits across the team" : "Your scheduled and past site visits"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchVisits(tab)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: tab === "upcoming" ? "Upcoming" : "Past",  value: counts.total,   icon: Calendar,     color: "var(--color-primary)" },
          { label: "Today",   value: counts.today,   icon: Clock,        color: "var(--color-warning)" },
          { label: "Overdue", value: counts.overdue, icon: AlertCircle,  color: "var(--color-destructive)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as "upcoming" | "past")}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />Past
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
      ) : visits.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Calendar className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            {tab === "upcoming" ? "No upcoming visits" : "No past visits"}
          </p>
          {tab === "upcoming" && (
            <Button size="sm" variant="outline" className="gap-2 mx-auto" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5" />Schedule one
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-2">
            {visits.map(v => (
              <VisitCard key={v.meta_lead_id} v={v} showOwner={isSuperAdmin} />
            ))}
          </div>
        </AnimatePresence>
      )}

      <ScheduleVisitDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => fetchVisits(tab)}
      />
    </div>
  )
}
