"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar,
  Loader2, Save, Check, Flame, Thermometer, Snowflake, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  assigned_to_profile: { id: string; full_name: string } | null
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
  follow_up_date: string | null
  hwc: string | null
  remarks: string | null
}

const BUDGET_RANGES = [
  "1–2 Cr", "2–3 Cr", "3–5 Cr", "5–7 Cr",
  "7–10 Cr", "10–15 Cr", "15–21 Cr", "21 Cr+",
]

const CONFIGURATIONS = ["3 BHK", "4 BHK", "Penthouse", "Villa", "Plot", "Other"]

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>{label}</Label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors bg-transparent"
        style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [lead, setLead] = useState<MetaLead | null>(null)
  const [crm, setCrm] = useState<CrmDetails>({
    first_call_date: null,
    last_call_date: null,
    call_status: null,
    site_visit_status: null,
    visit_date: null,
    visit_confirmation_date: null,
    buying_status: null,
    budget_range: null,
    configuration: null,
    follow_up_date: null,
    hwc: null,
    remarks: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [leadRes, crmRes] = await Promise.all([
          fetch(`/api/leads/meta/${id}`),
          fetch(`/api/leads/meta/${id}/crm`),
        ])
        const [leadJson, crmJson] = await Promise.all([leadRes.json(), crmRes.json()])
        if (leadJson.lead) setLead(leadJson.lead)
        if (crmJson.crm) setCrm(prev => ({ ...prev, ...crmJson.crm }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/leads/meta/${id}/crm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crm),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  function toggleConfig(c: string) {
    setCrm(prev => {
      const current = prev.configuration ?? []
      return {
        ...prev,
        configuration: current.includes(c)
          ? current.filter(x => x !== c)
          : [...current, c],
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Lead not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    )
  }

  const showSiteVisit = crm.call_status === "spoken"
  const showVisitDate = crm.site_visit_status === "visited"
  const showConfirmationDate = crm.site_visit_status === "visit_date_confirmed"

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </Button>

      {/* ── Section A: Meta lead info (read-only) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card" style={{ borderColor: "rgb(194 65 12 / 0.3)" }}>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-base font-bold shrink-0"
                style={{ color: "var(--color-primary-foreground)" }}>
                {(lead.full_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                  {lead.full_name ?? "Unknown"}
                </h2>
                {lead.campaign_name && (
                  <Badge variant="secondary" className="text-[10px] mt-1">{lead.campaign_name}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <Phone className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                  <span className="text-sm" style={{ color: "var(--color-foreground)" }}>{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <Mail className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                  <span className="text-sm truncate" style={{ color: "var(--color-foreground)" }}>{lead.email}</span>
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {lead.city && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                  <MapPin className="w-3.5 h-3.5" />{lead.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                <Calendar className="w-3.5 h-3.5" />
                Received {new Date(lead.received_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {lead.assigned_to_profile && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                  <User className="w-3.5 h-3.5" />{lead.assigned_to_profile.full_name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section B: CRM fields ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">CRM Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Call dates */}
            <div className="grid grid-cols-2 gap-4">
              <DateField
                label="First Call Date"
                value={crm.first_call_date ?? ""}
                onChange={v => setCrm(p => ({ ...p, first_call_date: v || null }))}
              />
              <DateField
                label="Last Call Date"
                value={crm.last_call_date ?? ""}
                onChange={v => setCrm(p => ({ ...p, last_call_date: v || null }))}
              />
            </div>

            {/* Call status */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Call Status</Label>
              <Select
                value={crm.call_status ?? ""}
                onValueChange={v => setCrm(p => ({
                  ...p,
                  call_status: v || null,
                  site_visit_status: null,
                  visit_date: null,
                  visit_confirmation_date: null
                }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spoken">Spoken</SelectItem>
                  <SelectItem value="not_spoken">Not Spoken</SelectItem>
                  <SelectItem value="call_back_later">Call Back Later</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Site visit — only when spoken */}
            {showSiteVisit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Site Visit Status</Label>
                  <Select
                    value={crm.site_visit_status ?? ""}
                    onValueChange={v => setCrm(p => ({
                      ...p,
                      site_visit_status: v || null,
                      visit_date: null,
                      visit_confirmation_date: null
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select visit status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yet_to_visit">Yet to Visit</SelectItem>
                      <SelectItem value="visit_week_confirmed">Visit Week Confirmed</SelectItem>
                      <SelectItem value="visit_date_confirmed">Visit Date Confirmed</SelectItem>
                      <SelectItem value="visited">Visited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showVisitDate && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <DateField
                      label="Visit Date"
                      value={crm.visit_date ?? ""}
                      onChange={v => setCrm(p => ({ ...p, visit_date: v || null }))}
                    />
                  </motion.div>
                )}

                {showConfirmationDate && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <DateField
                      label="Confirmation Date"
                      value={crm.visit_confirmation_date ?? ""}
                      onChange={v => setCrm(p => ({ ...p, visit_confirmation_date: v || null }))}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Buying status */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Buying Status</Label>
              <Select
                value={crm.buying_status ?? ""}
                onValueChange={v => setCrm(p => ({ ...p, buying_status: v || null }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select buying status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="still_searching">Still Searching</SelectItem>
                  <SelectItem value="postponed">Postponed for Now</SelectItem>
                  <SelectItem value="bought">Bought Already</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Budget Range</Label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map(range => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setCrm(p => ({ ...p, budget_range: p.budget_range === range ? null : range }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                    style={crm.budget_range === range ? {
                      background: "rgb(194 65 12 / 0.2)",
                      color: "var(--color-primary)",
                      border: "1px solid rgb(194 65 12 / 0.5)",
                    } : {
                      background: "var(--color-muted)",
                      color: "var(--color-muted-foreground)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Configuration Needed</Label>
              <div className="flex flex-wrap gap-2">
                {CONFIGURATIONS.map(cfg => {
                  const selected = (crm.configuration ?? []).includes(cfg)
                  return (
                    <button
                      key={cfg}
                      type="button"
                      onClick={() => toggleConfig(cfg)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                      style={selected ? {
                        background: "rgb(21 128 61 / 0.15)",
                        color: "var(--color-success)",
                        border: "1px solid rgb(21 128 61 / 0.4)",
                      } : {
                        background: "var(--color-muted)",
                        color: "var(--color-muted-foreground)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {cfg}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Follow-up date */}
            <DateField
              label="Follow-up Date"
              value={crm.follow_up_date ?? ""}
              onChange={v => setCrm(p => ({ ...p, follow_up_date: v || null }))}
            />

            {/* HWC */}
            <div className="space-y-2">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>HWC Rating</Label>
              <div className="flex gap-3">
                {[
                  { value: "hot", label: "Hot", icon: Flame, color: "var(--color-destructive)", bg: "rgb(185 28 28 / 0.15)", border: "rgb(185 28 28 / 0.4)" },
                  { value: "warm", label: "Warm", icon: Thermometer, color: "var(--color-warning)", bg: "rgb(217 119 6 / 0.15)", border: "rgb(217 119 6 / 0.4)" },
                  { value: "cold", label: "Cold", icon: Snowflake, color: "var(--color-muted-foreground)", bg: "rgb(154 52 18 / 0.15)", border: "rgb(154 52 18 / 0.4)" },
                ].map(({ value, label, icon: Icon, color, bg, border }) => {
                  const active = crm.hwc === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCrm(p => ({ ...p, hwc: p.hwc === value ? null : value }))}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                      style={active ? { background: bg, color, border: `1px solid ${border}` } : {
                        background: "var(--color-muted)",
                        color: "var(--color-muted-foreground)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Qualitative Remarks</Label>
              <Textarea
                placeholder="Notes about this client..."
                value={crm.remarks ?? ""}
                onChange={e => setCrm(p => ({ ...p, remarks: e.target.value || null }))}
                className="min-h-[100px] text-sm resize-none"
              />
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 font-semibold gold-gradient shadow-gold-sm"
              style={{ color: "var(--color-primary-foreground)" }}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : saved ? (
                <><Check className="w-4 h-4 mr-2" />Saved</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Details</>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
