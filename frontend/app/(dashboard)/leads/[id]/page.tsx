"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Loader2, Save,
  Check, Flame, Thermometer, Snowflake, User, History,
  AlertTriangle, Briefcase, Building, TrendingDown,
  PhoneOff, Clock, ChevronDown, ChevronUp
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  current_city: string | null
  current_area: string | null
  follow_up_date: string | null
  hwc: string | null
  remarks: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET_RANGES = [
  "1–2 Cr","2–3 Cr","3–5 Cr","5–7 Cr",
  "7–10 Cr","10–15 Cr","15–21 Cr","21 Cr+",
]
const CONFIGURATIONS = ["3 BHK","4 BHK","5 BHK","Penthouse","Villa","Plot","Other"]

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>{label}</Label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm bg-transparent"
        style={{ borderColor: "var(--color-border)", color: "oklch(0.88 0.006 80)" }} />
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
      <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="h-9 text-sm" />
    </div>
  )
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null
  const s = CLIENT_STATUSES.find(x => x.value === status)
  if (!s) return null
  const Icon = s.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}60` }}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

// ─── History Card ─────────────────────────────────────────────────────────────

function HistoryCard({ entry, isCurrent }: { entry: LeadHistory; isCurrent: boolean }) {
  const [open, setOpen] = useState(false)
  const hasCrm = entry.crm && (
    entry.crm.call_status ||
    entry.crm.remarks ||
    entry.crm.budget_range ||
    entry.crm.profession ||
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
            <span className="text-xs font-medium" style={{ color: "oklch(0.70 0.006 80)" }}>
              {formatDate(entry.received_at)}
            </span>
            {entry.campaign_name && <Badge variant="secondary" className="text-[10px]">{entry.campaign_name}</Badge>}
            {entry.source === "manual" && <Badge variant="outline" className="text-[10px]">Manual</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 mt-1">
            {entry.assigned_to_profile && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.55 0.006 260)" }}>
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
            style={{ color: "oklch(0.45 0.008 260)" }}>
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
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Budget: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.budget_range}</span></div>
                )}
                {entry.crm?.buying_status && (
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Buying: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.buying_status.replace(/_/g, " ")}</span></div>
                )}
                {entry.crm?.site_visit_status && (
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Site visit: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.site_visit_status.replace(/_/g, " ")}</span></div>
                )}
                {entry.crm?.configuration && entry.crm.configuration.length > 0 && (
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Config: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.configuration.join(", ")}</span></div>
                )}
                {entry.crm?.profession && (
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Profession: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.profession}</span></div>
                )}
                {entry.crm?.current_city && (
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Current city: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.current_city}</span></div>
                )}
                {entry.crm?.current_area && (
                  <div><span style={{ color: "oklch(0.50 0.006 260)" }}>Current area: </span>
                    <span style={{ color: "oklch(0.82 0.006 80)" }}>{entry.crm.current_area}</span></div>
                )}
              </div>
              {entry.crm?.remarks && (
                <p className="text-xs italic px-3 py-2 rounded-lg"
                  style={{ background: "oklch(0.18 0.012 260)", color: "oklch(0.70 0.006 80)" }}>
                  "{entry.crm.remarks}"
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    profession: null, current_city: null, current_area: null,
    follow_up_date: null, hwc: null, remarks: null,
  })
  const [clientStatus, setClientStatus] = useState<string | null>(null)
  const [clientNote, setClientNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"crm" | "history">("crm")

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
              setClientStatus(clientJson.client.status)
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

  async function handleSaveCrm() {
    setSaving(true)
    try {
      await fetch(`/api/leads/meta/${id}/crm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crm),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  async function handleSaveClientStatus() {
    if (!client) return
    setSavingStatus(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: clientStatus, status_note: clientNote }),
      })
      const json = await res.json()
      if (json.client) setClient(json.client)
    } finally { setSavingStatus(false) }
  }

  function toggleConfig(c: string) {
    setCrm(prev => {
      const cur = prev.configuration ?? []
      return { ...prev, configuration: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] }
    })
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
        <p className="text-sm" style={{ color: "oklch(0.55 0.006 260)" }}>Lead not found</p>
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

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </Button>

      {/* ── Client identity card ── */}
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
                  <h2 className="text-lg font-bold" style={{ color: "oklch(0.92 0.006 80)" }}>
                    {lead.full_name ?? "Unknown"}
                  </h2>
                  {clientStatus && <StatusPill status={clientStatus} />}
                  {repeatClient && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "oklch(0.75 0.18 35 / 0.15)", color: "oklch(0.75 0.18 35)", border: "1px solid oklch(0.75 0.18 35 / 0.3)" }}>
                      <History className="w-2.5 h-2.5" />
                      {client.total_inquiries}× REPEAT
                    </span>
                  )}
                </div>
                {lead.campaign_name && (
                  <Badge variant="secondary" className="text-[10px] mt-1">{lead.campaign_name}</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <Phone className="w-4 h-4 shrink-0" style={{ color: "oklch(0.700 0.130 75)" }} />
                  <span className="text-sm" style={{ color: "oklch(0.88 0.006 80)" }}>{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <Mail className="w-4 h-4 shrink-0" style={{ color: "oklch(0.700 0.130 75)" }} />
                  <span className="text-sm truncate" style={{ color: "oklch(0.88 0.006 80)" }}>{lead.email}</span>
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {lead.city && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.55 0.006 260)" }}>
                  <MapPin className="w-3.5 h-3.5" />{lead.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.55 0.006 260)" }}>
                <Calendar className="w-3.5 h-3.5" />Received {formatDate(lead.received_at)}
              </span>
              {lead.assigned_to_profile && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.55 0.006 260)" }}>
                  <User className="w-3.5 h-3.5" />{lead.assigned_to_profile.full_name}
                </span>
              )}
              {client && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.55 0.006 260)" }}>
                  <Clock className="w-3.5 h-3.5" />First seen {formatDate(client.first_seen_at)}
                </span>
              )}
            </div>

            {/* Client status picker */}
            <div className="pt-1 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.45 0.008 260)" }}>
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
                        : { background: "oklch(0.185 0.015 260)", color: "oklch(0.55 0.006 260)", border: "1px solid oklch(0.250 0.014 260)" }}>
                      <Icon className="w-3 h-3" />{s.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Optional note..."
                  value={clientNote} onChange={e => setClientNote(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-lg text-xs bg-transparent"
                  style={{ border: "1px solid var(--color-border)", color: "oklch(0.82 0.006 80)" }} />
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0"
                  onClick={handleSaveClientStatus} disabled={savingStatus}>
                  {savingStatus
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <><Check className="w-3.5 h-3.5" />Save</>}
                </Button>
              </div>
              {client?.status_updated_by_profile && client.status_updated_at && (
                <p className="text-[10px]" style={{ color: "oklch(0.42 0.008 260)" }}>
                  Updated by {client.status_updated_by_profile.full_name} · {formatDate(client.status_updated_at)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Tab switcher ── */}
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
              : { background: "transparent", color: "oklch(0.50 0.008 260)" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── CRM tab ── */}
        {activeTab === "crm" && (
          <motion.div key="crm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">CRM Details — This Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.60 0.006 260)" }}>
                    Client Details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextField label="Profession" value={crm.profession ?? ""} placeholder="e.g. Founder, Doctor"
                      onChange={v => setCrm(p => ({ ...p, profession: v || null }))} />
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
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>Call Status</Label>
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
                      <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>Site Visit Status</Label>
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
                      <DateField label="Visit Date" value={crm.visit_date ?? ""}
                        onChange={v => setCrm(p => ({ ...p, visit_date: v || null }))} />
                    )}
                    {showConfirmDate && (
                      <DateField label="Confirmation Date" value={crm.visit_confirmation_date ?? ""}
                        onChange={v => setCrm(p => ({ ...p, visit_confirmation_date: v || null }))} />
                    )}
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>Buying Status</Label>
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

                <div className="space-y-2">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>Budget Range</Label>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_RANGES.map(range => (
                      <button key={range} type="button"
                        onClick={() => setCrm(p => ({ ...p, budget_range: p.budget_range === range ? null : range }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={crm.budget_range === range
                          ? { background: "oklch(0.700 0.130 75 / 0.2)", color: "oklch(0.700 0.130 75)", border: "1px solid oklch(0.700 0.130 75 / 0.5)" }
                          : { background: "oklch(0.185 0.015 260)", color: "oklch(0.65 0.006 260)", border: "1px solid oklch(0.250 0.014 260)" }}>
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>Configuration Needed</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONFIGURATIONS.map(cfg => {
                      const selected = (crm.configuration ?? []).includes(cfg)
                      return (
                        <button key={cfg} type="button" onClick={() => toggleConfig(cfg)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={selected
                            ? { background: "oklch(0.65 0.15 145 / 0.15)", color: "oklch(0.65 0.15 145)", border: "1px solid oklch(0.65 0.15 145 / 0.4)" }
                            : { background: "oklch(0.185 0.015 260)", color: "oklch(0.65 0.006 260)", border: "1px solid oklch(0.250 0.014 260)" }}>
                          {cfg}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <DateField label="Follow-up Date" value={crm.follow_up_date ?? ""}
                  onChange={v => setCrm(p => ({ ...p, follow_up_date: v || null }))} />

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.006 260)" }}>Qualitative Remarks</Label>
                  <Textarea placeholder="Notes about this lead interaction..."
                    value={crm.remarks ?? ""} onChange={e => setCrm(p => ({ ...p, remarks: e.target.value || null }))}
                    className="min-h-[90px] text-sm resize-none" />
                </div>

                <Button onClick={handleSaveCrm} disabled={saving}
                  className="w-full h-10 font-semibold gold-gradient shadow-gold-sm"
                  style={{ color: "oklch(0.10 0.010 260)" }}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                    : saved ? <><Check className="w-4 h-4 mr-2" />Saved</>
                    : <><Save className="w-4 h-4 mr-2" />Save Details</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── History tab ── */}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: "oklch(0.700 0.130 75)" }} />
                  All Enquiries — {lead.full_name}
                </CardTitle>
                {client && (
                  <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.006 260)" }}>
                    First enquiry {formatDate(client.first_seen_at)} · {client.total_inquiries} total
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "oklch(0.50 0.006 260)" }}>
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
    </div>
  )
}
