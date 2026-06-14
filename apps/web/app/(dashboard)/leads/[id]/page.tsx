"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Loader2, Save,
  Check, Flame, Thermometer, Snowflake, User, History,
  AlertTriangle, Briefcase, Building, TrendingDown,
  PhoneOff, Clock, ChevronDown, ChevronUp, Trash2, type LucideIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatPhone, phoneHref } from "@/lib/utils"
import { getAuthUser } from "@/lib/auth/cookies"
import { ProtectedPhone } from "@/components/security/protected-phone"

// Types

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  received_at: string
  client_id: string | null
  assigned_to_profile: { id: string; full_name: string } | null
}

interface ClientProfile {
  id: string
  phone: string
  full_name: string | null
  email: string | null
  city: string | null
  status: string | null
  status_note: string | null
  status_updated_at: string | null
  first_seen_at: string
  last_seen_at: string
  total_inquiries: number
  status_updated_by_profile: { full_name: string } | null
}

interface LeadHistory {
  id: string
  campaign_name: string | null
  source: string
  status: string
  received_at: string
  assigned_to_profile: { id: string; full_name: string } | null
  crm: {
    call_status: string | null
    site_visit_status: string | null
    buying_status: string | null
    budget_range: string | null
    configuration: string[] | null
    profession: string | null
    company_name: string | null
    current_city: string | null
    current_area: string | null
    hwc: string | null
    remarks: string | null
  } | null
}

interface CrmDetails {
  first_call_date: string | null
  last_call_date: string | null
  call_status: string | null
  site_visit_status: string | null
  visit_date: string | null
  visit_confirmation_date: string | null
  buying_status: string | null
  budget_range: string | null
  configuration: string[] | null
  profession: string | null
  company_name: string | null
  current_city: string | null
  current_area: string | null
  follow_up_date: string | null
  hwc: string | null
  remarks: string | null
}

// Constants

const BUDGET_OPTIONS = [
  "1 Cr","2 Cr","3 Cr","4 Cr","5 Cr","6 Cr","7 Cr",
  "8 Cr","9 Cr","10 Cr","11 Cr","12 Cr","13 Cr","14 Cr",
  "15 Cr","16 Cr","17 Cr","18 Cr","19 Cr","20 Cr",
  "21 Cr+",
]
const CONFIGURATIONS = ["3 BHK","4 BHK","5 BHK","Penthouse","Bungalows","Villa","Plot","Other"]

const CLIENT_STATUSES = [
  { value: "hot",   label: "Hot",   icon: Flame,         color: "oklch(0.75 0.18 35)",  bg: "oklch(0.75 0.18 35 / 0.15)"  },
  { value: "warm",  label: "Warm",  icon: Thermometer,   color: "oklch(0.78 0.15 65)",  bg: "oklch(0.78 0.15 65 / 0.15)"  },
  { value: "cold",  label: "Cold",  icon: Snowflake,     color: "oklch(0.65 0.15 250)", bg: "oklch(0.65 0.15 250 / 0.15)" },
  { value: "lost",  label: "Lost",  icon: TrendingDown,  color: "oklch(0.60 0.12 20)",  bg: "oklch(0.60 0.12 20 / 0.15)"  },
  { value: "low_budget",           label: "Low Budget",          icon: AlertTriangle, color: "oklch(0.72 0.15 85)",  bg: "oklch(0.72 0.15 85 / 0.15)"  },
  { value: "not_interested",       label: "Not Interested",       icon: PhoneOff,      color: "oklch(0.55 0.08 260)", bg: "oklch(0.55 0.08 260 / 0.15)" },
  { value: "broker",               label: "Broker",               icon: Briefcase,     color: "oklch(0.65 0.15 145)", bg: "oklch(0.65 0.15 145 / 0.15)" },
  { value: "construction_biz_owner", label: "Construction Owner", icon: Building,      color: "oklch(0.65 0.12 200)", bg: "oklch(0.65 0.12 200 / 0.15)" },
]
const CLIENT_STATUS_VALUES = new Set(CLIENT_STATUSES.map(status => status.value))

// Helpers

// Convert ISO timestamp or any string -> "YYYY-MM-DD" for date inputs
function isoToDateInput(v: string | null): string {
  if (!v) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date(v)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>{label}</Label>
      <input type="date" value={isoToDateInput(value)} onChange={e => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm bg-transparent"
        style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }} />
    </div>
  )
}

// Convert ISO timestamp -> "YYYY-MM-DDTHH:MM" for datetime-local inputs (local tz)
function isoToLocalInput(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function DateTimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>{label}</Label>
      <input
        type="datetime-local"
        value={isoToLocalInput(value)}
        onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm bg-transparent"
        style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
      />
    </div>
  )
}

function TextField({ label, value, placeholder, onChange }: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="h-9 text-sm" />
    </div>
  )
}

function StatusPill({ status }: { status: string | null }) {
  if (!status || !CLIENT_STATUS_VALUES.has(status)) return null
  const s = CLIENT_STATUSES.find(x => x.value === status)
  if (!s) return null
  const Icon = s.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.color, color: "#fff", border: `1px solid ${s.color}` }}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function LeadInfoCard({ label, value, icon: Icon, href, protectedValue }: {
  label: string
  value: string
  icon: LucideIcon
  href?: string
  protectedValue?: string | null
}) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "oklch(0.700 0.130 75 / 0.12)", color: "oklch(0.700 0.130 75)" }}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "oklch(0.54 0.10 45)" }}>
          {label}
        </span>
        {protectedValue ? (
          <ProtectedPhone value={protectedValue} className="block truncate text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
            {value}
          </ProtectedPhone>
        ) : (
          <span className="block truncate text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
            {value}
          </span>
        )}
      </span>
    </>
  )

  const className = "flex min-h-[62px] items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors"
  const style = { border: "1px solid var(--color-border)", background: "color-mix(in oklab, var(--color-card), var(--color-muted) 18%)" }

  if (href) {
    return (
      <a href={href} className={`${className} hover:bg-white/60`} style={style}>
        {content}
      </a>
    )
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  )
}

// History Card

function HistoryCard({ entry, isCurrent }: { entry: LeadHistory; isCurrent: boolean }) {
  const [open, setOpen] = useState(false)
  const hasCrm = entry.crm && (
    entry.crm.call_status ||
    entry.crm.remarks ||
    entry.crm.budget_range ||
    entry.crm.profession ||
    entry.crm.company_name ||
    entry.crm.current_city ||
    entry.crm.current_area
  )

  return (
    <div className="rounded-xl overflow-hidden" style={{
      border: `1px solid ${isCurrent ? "oklch(0.700 0.130 75 / 0.5)" : "var(--color-border)"}`,
      background: isCurrent ? "oklch(0.700 0.130 75 / 0.04)" : "var(--color-card)"
    }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isCurrent && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "oklch(0.700 0.130 75 / 0.2)", color: "oklch(0.700 0.130 75)" }}>
                THIS LEAD
              </span>
            )}
            <span className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>
              {formatDate(entry.received_at)}
            </span>
            {entry.campaign_name && <Badge variant="secondary" className="text-[10px]">{entry.campaign_name}</Badge>}
            {entry.source === "manual" && <Badge variant="outline" className="text-[10px]">Manual</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 mt-1">
            {entry.assigned_to_profile && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-foreground)" }}>
                <User className="w-3 h-3" />{entry.assigned_to_profile.full_name}
              </span>
            )}
            {entry.crm?.call_status && (
              <span className="text-[11px]" style={{ color: "oklch(0.65 0.15 145)" }}>
                {{ spoken: "Spoken", not_spoken: "Not Spoken", call_back_later: "Call Back" }[entry.crm.call_status] ?? entry.crm.call_status}
              </span>
            )}
            {entry.crm?.hwc && <StatusPill status={entry.crm.hwc} />}
          </div>
        </div>
        {hasCrm && (
          <button onClick={() => setOpen(p => !p)}
            className="shrink-0 p-1 rounded hover:bg-white/5"
            style={{ color: "var(--color-foreground)" }}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && hasCrm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <div className="pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {entry.crm?.budget_range && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Budget: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.budget_range}</span></div>
                )}
                {entry.crm?.buying_status && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Buying: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.buying_status.replace(/_/g, " ")}</span></div>
                )}
                {entry.crm?.site_visit_status && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Site visit: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.site_visit_status.replace(/_/g, " ")}</span></div>
                )}
                {entry.crm?.configuration && entry.crm.configuration.length > 0 && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Config: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.configuration.join(", ")}</span></div>
                )}
                {entry.crm?.profession && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Profession: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.profession}</span></div>
                )}
                {entry.crm?.company_name && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Company: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.company_name}</span></div>
                )}
                {entry.crm?.current_city && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Current city: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.current_city}</span></div>
                )}
                {entry.crm?.current_area && (
                  <div><span style={{ color: "var(--color-foreground)" }}>Current area: </span>
                    <span style={{ color: "var(--color-foreground)" }}>{entry.crm.current_area}</span></div>
                )}
              </div>
              {entry.crm?.remarks && (
                <p className="text-xs italic px-3 py-2 rounded-lg"
                  style={{ background: "oklch(0.18 0.012 260)", color: "oklch(0.90 0.004 260)" }}>
                  &quot;{entry.crm.remarks}&quot;
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Page

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [lead, setLead] = useState<MetaLead | null>(null)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [history, setHistory] = useState<LeadHistory[]>([])
  const [crm, setCrm] = useState<CrmDetails>({
    first_call_date: null, last_call_date: null, call_status: null,
    site_visit_status: null, visit_date: null, visit_confirmation_date: null,
    buying_status: null, budget_range: null, configuration: null,
    profession: null, company_name: null, current_city: null, current_area: null,
    follow_up_date: null, hwc: null, remarks: null,
  })
  const [clientStatus, setClientStatus] = useState<string | null>(null)
  const [clientNote, setClientNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"crm" | "history">("crm")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setIsSuperAdmin(getAuthUser()?.role === "super_admin")
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [leadRes, crmRes] = await Promise.all([
          fetch(`/api/leads/meta/${id}`),
          fetch(`/api/leads/meta/${id}/crm`),
        ])
        const [leadJson, crmJson] = await Promise.all([leadRes.json(), crmRes.json()])

        if (leadJson.lead) {
          setLead(leadJson.lead)
          if (leadJson.lead.client_id) {
            const clientRes = await fetch(`/api/clients/${leadJson.lead.client_id}`)
            const clientJson = await clientRes.json()
            if (clientJson.client) {
              setClient(clientJson.client)
              setClientStatus(CLIENT_STATUS_VALUES.has(clientJson.client.status) ? clientJson.client.status : null)
              setClientNote(clientJson.client.status_note ?? "")
            }
            if (clientJson.leads) setHistory(clientJson.leads)
          }
        }
        if (crmJson.crm) setCrm(prev => ({ ...prev, ...crmJson.crm }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSaveAll() {
    setSaving(true)
    try {
      // Explicitly pick only the fields the API accepts to avoid DTO rejections.
      const payload = {
        call_status: crm.call_status,
        first_call_date: crm.first_call_date,
        last_call_date: crm.last_call_date,
        hwc: crm.hwc,
        follow_up_date: crm.follow_up_date,
        buying_status: crm.buying_status,
        site_visit_status: crm.site_visit_status,
        visit_date: crm.visit_date,
        visit_confirmation_date: crm.visit_confirmation_date,
        budget_range: crm.budget_range,
        configuration: crm.configuration,
        profession: crm.profession,
        company_name: crm.company_name,
        current_city: crm.current_city,
        current_area: crm.current_area,
        remarks: crm.remarks,
      }
      const res = await fetch(`/api/leads/meta/${id}/crm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = Array.isArray(json.message) ? json.message.join(", ") : (json.message ?? json.error ?? "Failed to save")
        throw new Error(msg)
      }

      if (json.lead?.crm) setCrm(prev => ({ ...prev, ...json.lead.crm }))

      if (client) {
        const statusRes = await fetch(`/api/clients/${client.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: clientStatus, status_note: clientNote }),
        })
        const statusJson = await statusRes.json().catch(() => ({}))
        if (!statusRes.ok) {
          const msg = Array.isArray(statusJson.message)
            ? statusJson.message.join(", ")
            : (statusJson.message ?? statusJson.error ?? "Failed to save client status")
          throw new Error(msg)
        }
        if (statusJson.client) {
          setClient(statusJson.client)
          setClientStatus(CLIENT_STATUS_VALUES.has(statusJson.client.status) ? statusJson.client.status : null)
          setClientNote(statusJson.client.status_note ?? "")
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally { setSaving(false) }
  }

  function toggleConfig(c: string) {
    setCrm(prev => {
      const cur = prev.configuration ?? []
      return { ...prev, configuration: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] }
    })
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/meta/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? json.error ?? "Failed to delete lead")
      }
      router.push("/leads")
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete lead")
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.700 0.130 75)" }} />
      </div>
    )
  }
  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: "var(--color-foreground)" }}>Lead not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    )
  }

  const repeatClient = client && client.total_inquiries > 1
  const showSiteVisit = crm.call_status === "spoken"
  const showVisitDate = crm.site_visit_status === "visited"
  const showConfirmDate = crm.site_visit_status === "visit_date_confirmed"
  const clientStatusSection = (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-foreground)" }}>
        Client Status
      </p>
      <div className="flex flex-wrap gap-2">
        {CLIENT_STATUSES.map(s => {
          const Icon = s.icon
          const active = clientStatus === s.value
          return (
            <button key={s.value}
              onClick={() => setClientStatus(active ? null : s.value)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={active ? { background: s.bg, color: s.color, border: `1px solid ${s.color}60` }
                : { background: "oklch(0.185 0.015 260)", color: "oklch(0.90 0.004 260)", border: "1px solid oklch(0.320 0.014 260)" }}>
              <Icon className="w-3 h-3" />{s.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Optional note..."
          value={clientNote} onChange={e => setClientNote(e.target.value)}
          className="flex-1 h-8 px-3 rounded-lg text-xs bg-transparent"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
      </div>
      {client?.status_updated_by_profile && client.status_updated_at && (
        <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
          Updated by {client.status_updated_by_profile.full_name} - {formatDate(client.status_updated_at)}
        </p>
      )}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Button>
        {isSuperAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" /> Delete Lead
          </Button>
        )}
      </div>

      {/* Client identity card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card" style={{
          borderColor: repeatClient ? "oklch(0.75 0.18 35 / 0.4)" : "oklch(0.700 0.130 75 / 0.3)"
        }}>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-base font-bold shrink-0"
                style={{ color: "oklch(0.10 0.010 260)" }}>
                {(lead.full_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                    {lead.full_name ?? "Unknown"}
                  </h2>
                  {repeatClient && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "oklch(0.75 0.18 35 / 0.15)", color: "oklch(0.75 0.18 35)", border: "1px solid oklch(0.75 0.18 35 / 0.3)" }}>
                      <History className="w-2.5 h-2.5" />
                      {client.total_inquiries}× REPEAT
                    </span>
                  )}
                </div>
                {lead.campaign_name && (
                  <Badge variant="secondary" className="text-sm mt-1 px-2.5 py-0.5">{lead.campaign_name}</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lead.phone && (
                <LeadInfoCard label="Phone" value={formatPhone(lead.phone)} icon={Phone} href={phoneHref(lead.phone)} protectedValue={lead.phone} />
              )}
              {lead.email && (
                <LeadInfoCard label="Email" value={lead.email} icon={Mail} href={`mailto:${lead.email}`} />
              )}
            </div>

            {(crm.profession || crm.company_name || crm.current_city || crm.budget_range || lead.city) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {crm.profession && (
                  <LeadInfoCard label="Profession" value={crm.profession} icon={Briefcase} />
                )}
                {crm.company_name && (
                  <LeadInfoCard label="Company" value={crm.company_name} icon={Building} />
                )}
                {crm.budget_range && (
                  <LeadInfoCard label="Budget" value={crm.budget_range} icon={AlertTriangle} />
                )}
                {lead.city && (
                  <LeadInfoCard label="City" value={lead.city} icon={MapPin} />
                )}
                {crm.current_city && (
                  <LeadInfoCard label="Current City" value={crm.current_city} icon={MapPin} />
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-foreground)" }}>
                <Calendar className="w-3.5 h-3.5" />Received {formatDate(lead.received_at)}
              </span>
              {lead.assigned_to_profile && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-foreground)" }}>
                  <User className="w-3.5 h-3.5" />{lead.assigned_to_profile.full_name}
                </span>
              )}
              {client && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-foreground)" }}>
                  <Clock className="w-3.5 h-3.5" />First seen {formatDate(client.first_seen_at)}
                </span>
              )}
            </div>

          </CardContent>
        </Card>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        {([
          { key: "crm",     label: "CRM Details" },
          { key: "history", label: `History (${history.length})` },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={activeTab === tab.key
              ? { background: "oklch(0.700 0.130 75 / 0.15)", color: "oklch(0.700 0.130 75)" }
              : { background: "transparent", color: "var(--color-muted-foreground)" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* CRM tab */}
        {activeTab === "crm" && (
          <motion.div key="crm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">CRM Details — This Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-foreground)" }}>
                    Client Details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Profession" value={crm.profession ?? ""} placeholder="e.g. Founder, Doctor"
                      onChange={v => setCrm(p => ({ ...p, profession: v || null }))} />
                    <TextField label="Company" value={crm.company_name ?? ""} placeholder="e.g. Acme Corp"
                      onChange={v => setCrm(p => ({ ...p, company_name: v || null }))} />
                    <TextField label="Current City" value={crm.current_city ?? ""} placeholder="e.g. Pune"
                      onChange={v => setCrm(p => ({ ...p, current_city: v || null }))} />
                    <TextField label="Current Area" value={crm.current_area ?? ""} placeholder="e.g. Baner"
                      onChange={v => setCrm(p => ({ ...p, current_area: v || null }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DateField label="First Call Date" value={crm.first_call_date ?? ""}
                    onChange={v => setCrm(p => ({ ...p, first_call_date: v || null }))} />
                  <DateField label="Last Call Date" value={crm.last_call_date ?? ""}
                    onChange={v => setCrm(p => ({ ...p, last_call_date: v || null }))} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Call Status</Label>
                  <Select value={crm.call_status ?? ""} onValueChange={v => setCrm(p => ({
                    ...p, call_status: v || null, site_visit_status: null, visit_date: null, visit_confirmation_date: null
                  }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spoken">Spoken</SelectItem>
                      <SelectItem value="not_spoken">Not Spoken</SelectItem>
                      <SelectItem value="call_back_later">Call Back Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showSiteVisit && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Site Visit Status</Label>
                      <Select value={crm.site_visit_status ?? ""} onValueChange={v => setCrm(p => ({
                        ...p, site_visit_status: v || null, visit_date: null, visit_confirmation_date: null
                      }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select visit status..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yet_to_visit">Yet to Visit</SelectItem>
                          <SelectItem value="visit_week_confirmed">Visit Week Confirmed</SelectItem>
                          <SelectItem value="visit_date_confirmed">Visit Date Confirmed</SelectItem>
                          <SelectItem value="visited">Visited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showVisitDate && (
                      <DateTimeField label="Visit Date & Time" value={crm.visit_date}
                        onChange={v => setCrm(p => ({ ...p, visit_date: v }))} />
                    )}
                    {showConfirmDate && (
                      <DateTimeField label="Confirmation Date & Time" value={crm.visit_confirmation_date}
                        onChange={v => setCrm(p => ({ ...p, visit_confirmation_date: v }))} />
                    )}
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Buying Status</Label>
                  <Select value={crm.buying_status ?? ""} onValueChange={v => setCrm(p => ({ ...p, buying_status: v || null }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select buying status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="still_searching">Still Searching</SelectItem>
                      <SelectItem value="postponed">Postponed for Now</SelectItem>
                      <SelectItem value="bought">Bought Already</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Budget</Label>
                  <Select value={crm.budget_range ?? ""} onValueChange={v => setCrm(p => ({ ...p, budget_range: v || null }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select budget..." /></SelectTrigger>
                    <SelectContent>
                      {BUDGET_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Configuration Needed</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONFIGURATIONS.map(cfg => {
                      const selected = (crm.configuration ?? []).includes(cfg)
                      return (
                        <button key={cfg} type="button" onClick={() => toggleConfig(cfg)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={selected
                            ? { background: "oklch(0.65 0.15 145 / 0.15)", color: "oklch(0.65 0.15 145)", border: "1px solid oklch(0.65 0.15 145 / 0.4)" }
                            : { background: "oklch(0.185 0.015 260)", color: "oklch(0.90 0.004 260)", border: "1px solid oklch(0.320 0.014 260)" }}>
                          {cfg}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <DateField label="Follow-up Date" value={crm.follow_up_date ?? ""}
                  onChange={v => setCrm(p => ({ ...p, follow_up_date: v || null }))} />

                {clientStatusSection}

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Qualitative Remarks</Label>
                  <Textarea placeholder="Notes about this lead interaction..."
                    value={crm.remarks ?? ""} onChange={e => setCrm(p => ({ ...p, remarks: e.target.value || null }))}
                    className="min-h-[90px] text-sm resize-none" />
                </div>

                <Button onClick={handleSaveAll} disabled={saving}
                  className="w-full h-10 font-semibold gold-gradient shadow-gold-sm"
                  style={{ color: "oklch(0.10 0.010 260)" }}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                    : saved ? <><Check className="w-4 h-4 mr-2" />Saved</>
                    : <><Save className="w-4 h-4 mr-2" />Save All Changes</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: "oklch(0.700 0.130 75)" }} />
                  All Enquiries — {lead.full_name}
                </CardTitle>
                {client && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-foreground)" }}>
                    First enquiry {formatDate(client.first_seen_at)} · {client.total_inquiries} total
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "var(--color-foreground)" }}>
                    No previous enquiries
                  </p>
                ) : (
                  history.map(entry => (
                    <HistoryCard key={entry.id} entry={entry} isCurrent={entry.id === id} />
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmDelete} onOpenChange={o => !deleting && setConfirmDelete(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {lead.full_name ?? "this lead"} and all of its CRM details, notes,
              interactions and site visits from the database. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
