"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Loader2, Save,
  Check, Flame, Thermometer, Snowflake, User, History,
  AlertTriangle, Briefcase, Building, TrendingDown,
  PhoneOff, Clock, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight,
  Activity, ArrowRight, Sparkles, Copy, Home, ArrowUp, ArrowDown, ShieldOff,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatPhone, phoneHref } from "@/lib/utils"
import { getAuthUser } from "@/lib/auth/cookies"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { getLeadDisplaySections } from "@/lib/lead-display-order"
import { readLeadQueueSnapshot } from "@/lib/lead-list-state"
import {
  isAntiBrokerCompatibleStatus,
  missingSpokenLeadFields,
  NOT_PROVIDED_BY_CLIENT,
  SPOKEN_REQUIRED_FIELD_LABELS,
} from "@pikorua/shared"

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
  crm?: {
    call_status?: string | null
    follow_up_date?: string | null
  } | null
}

interface ClientProfile {
  id: string
  phone: string
  full_name: string | null
  email: string | null
  city: string | null
  status: string | null
  anti_broker: boolean
  construction_business_owner: boolean
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
  client_status?: string | null
  client_anti_broker?: boolean
  client_construction_business_owner?: boolean
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

interface LeadActivity {
  id: string
  lead_id: string
  actor_user_id: string | null
  actor_name: string | null
  event_type: string
  source: string
  title: string
  description: string | null
  from_user_id: string | null
  from_user_name: string | null
  to_user_id: string | null
  to_user_name: string | null
  changes: Record<string, { label: string; from: unknown; to: unknown }> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface LeadFollowUp {
  id: string
  lead_id: string
  scheduled_at: string
  status: "scheduled" | "completed" | "cancelled"
  call_status: "spoken" | "not_spoken" | null
  notes: string | null
  outcome_remarks: string | null
  completed_at: string | null
  created_by_name: string | null
  completed_by_name: string | null
  created_at: string
  updated_at: string
}

interface CrmDetails {
  first_call_date: string | null
  last_call_date: string | null
  call_status: string | null
  not_spoken_reason: string | null
  site_visit_status: string | null
  visit_date: string | null
  visit_confirmation_date: string | null
  project_name: string | null
  buying_status: string | null
  budget_range: string | null
  configuration: string[] | null
  profession: string | null
  company_name: string | null
  current_city: string | null
  current_area: string | null
  preferred_locations: string[] | null
  follow_up_date: string | null
  follow_up_done: boolean
  follow_up_remarks: string | null
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
const CONFIGURATIONS = ["3 BHK","4 BHK","5 BHK","Penthouse","Bungalows","Duplex","Plot","Other"]
const CALL_STATUS_OPTIONS = [
  { value: "spoken", label: "Spoken" },
  { value: "not_spoken", label: "Not Spoken" },
  { value: "call_back_later", label: "Call Back Later" },
]
const NOT_SPOKEN_REASON_OPTIONS = [
  { value: "customer_busy", label: "Customer is Busy" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "out_of_reach", label: "Number Out of Reach" },
  { value: "did_not_pickup", label: "Did Not Pick Up" },
]
const SITE_VISIT_STATUS_OPTIONS = [
  { value: "yet_to_visit", label: "Yet to Visit" },
  { value: "visit_week_confirmed", label: "Visit Week Confirmed" },
  { value: "visit_date_confirmed", label: "Visit Date Confirmed" },
  { value: "visited", label: "Visited" },
]
const BUYING_STATUS_OPTIONS = [
  { value: "still_searching", label: "Still Searching" },
  { value: "interested", label: "Interested" },
  { value: "postponed", label: "Postponed for Now" },
  { value: "bought", label: "Bought Already" },
  { value: "not_interested", label: "Not Interested" },
]

const CLIENT_STATUSES = [
  { value: "hot",   label: "Hot",   icon: Flame,         color: "oklch(0.75 0.18 35)",  bg: "oklch(0.75 0.18 35 / 0.15)"  },
  { value: "warm",  label: "Warm",  icon: Thermometer,   color: "oklch(0.78 0.15 65)",  bg: "oklch(0.78 0.15 65 / 0.15)"  },
  { value: "cold",  label: "Cold",  icon: Snowflake,     color: "oklch(0.65 0.15 250)", bg: "oklch(0.65 0.15 250 / 0.15)" },
  { value: "postponed", label: "Postponed", icon: Clock, color: "oklch(0.68 0.12 285)", bg: "oklch(0.68 0.12 285 / 0.15)" },
  { value: "lost",  label: "Lost",  icon: TrendingDown,  color: "oklch(0.60 0.12 20)",  bg: "oklch(0.60 0.12 20 / 0.15)"  },
  { value: "low_budget",           label: "Low Budget",          icon: AlertTriangle, color: "oklch(0.72 0.15 85)",  bg: "oklch(0.72 0.15 85 / 0.15)"  },
  { value: "not_interested",       label: "Not Interested",       icon: PhoneOff,      color: "oklch(0.55 0.08 260)", bg: "oklch(0.55 0.08 260 / 0.15)" },
  { value: "broker",               label: "Broker",               icon: Briefcase,     color: "oklch(0.65 0.15 145)", bg: "oklch(0.65 0.15 145 / 0.15)" },
]
const CLIENT_STATUS_VALUES = new Set(CLIENT_STATUSES.map(status => status.value))
const BUYING_STATUS_OPTIONAL_CLIENT_STATUSES = new Set(["broker"])

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

interface RecommendedProperty {
  id: string
  name: string
  type: string
  location: string
  area: string | null
  price: string | number
  price_per_sqft?: string | number | null
  pricePerSqft?: string | number | null
  status: "available" | "sold" | "reserved" | "upcoming"
  developer: string | null
  sample_house?: boolean | null
  sampleHouse?: boolean | null
  roi?: string | number | null
  unit_configurations?: RecommendedUnit[] | null
  unitConfigurations?: RecommendedUnit[] | null
}

interface RecommendedUnit {
  configuration?: string | null
  area_sqft?: string | null
  carpet_area_sqft?: string | null
  basic_rate?: string | null
  price?: string | null
  price_min?: number | string | null
}

interface PropertyRecommendation {
  property: RecommendedProperty
  score: number
  match_reasons: string[]
  pitch_points: string[]
  warnings: string[]
  matched_units: RecommendedUnit[]
}

type PropertyLocationRow = {
  location?: unknown
  area?: unknown
}

function localDateTimeParts(value: string | null) {
  if (!value) return { date: "", time: "" }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value, time: "00:00" }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: "", time: "" }
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function combineLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString()
}

function FollowUpDateTimeFields({ label, value, onChange }: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
}) {
  const parts = localDateTimeParts(value)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>{label}</Label>
        <input type="date" value={parts.date} onChange={e => {
          const date = e.target.value
          onChange(date ? combineLocalDateTime(date, parts.time || "09:00") : null)
        }}
          className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm bg-transparent"
          style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>Follow-up Time</Label>
        <input type="time" value={parts.time} disabled={!parts.date} onChange={e => {
          if (parts.date && e.target.value) onChange(combineLocalDateTime(parts.date, e.target.value))
        }}
          className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }} />
      </div>
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

function ClientProvidedField({ label, value, placeholder, required, onChange }: {
  label: string
  value: string
  placeholder: string
  required: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
        {label}{required && <span style={{ color: "var(--color-primary)" }}> *</span>}
      </Label>
      <SearchableSelect
        value={value}
        onValueChange={nextValue => onChange(nextValue === "__clear__" ? "" : nextValue)}
        options={[
          { value: "__clear__", label: `Clear ${label.toLowerCase()}` },
          { value: NOT_PROVIDED_BY_CLIENT, label: NOT_PROVIDED_BY_CLIENT },
        ]}
        placeholder={placeholder}
        searchPlaceholder={`Type or search ${label.toLowerCase()}...`}
        allowCustomValue
        customOptionLabel={custom => `Use "${custom}"`}
        triggerClassName="h-9 text-sm"
      />
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Empty"
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Empty"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "string") {
    const maybeDate = value.match(/^\d{4}-\d{2}-\d{2}/) ? new Date(value) : null
    if (maybeDate && !Number.isNaN(maybeDate.getTime())) return formatDateTime(value)
    return value.replace(/_/g, " ")
  }
  return String(value)
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

function toCurrency(value: string | number | null | undefined) {
  const numeric = typeof value === "number"
    ? value
    : Number(String(value ?? "").replace(/[^0-9.]/g, ""))

  if (!Number.isFinite(numeric)) return String(value ?? "Price pending")
  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(2)} Cr`
  if (numeric >= 100000) return `₹${(numeric / 100000).toFixed(2)} L`
  return `₹${numeric.toLocaleString("en-IN")}`
}

function propertySampleHouse(property: RecommendedProperty) {
  return Boolean(property.sampleHouse ?? property.sample_house)
}

function getPropertyUnits(property: RecommendedProperty) {
  return property.unitConfigurations ?? property.unit_configurations ?? []
}

function recommendationPitchText(recommendation: PropertyRecommendation) {
  return [
    recommendation.property.name,
    ...recommendation.pitch_points,
    ...recommendation.warnings.map(warning => `Note: ${warning}`),
  ].join("\n")
}

function RecommendationCard({
  recommendation,
  onUse,
  onOpen,
  onCopy,
}: {
  recommendation: PropertyRecommendation
  onUse: () => void
  onOpen: () => void
  onCopy: () => void
}) {
  const property = recommendation.property
  const matchedUnits = recommendation.matched_units ?? []

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--color-border)", background: "color-mix(in oklab, var(--color-card), var(--color-muted) 12%)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{property.name}</h3>
            <Badge variant={property.status === "available" ? "default" : "secondary"} className="text-[10px]">
              {property.status}
            </Badge>
            {propertySampleHouse(property) && (
              <Badge variant="outline" className="text-[10px]">Sample house</Badge>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
            <MapPin className="h-3.5 w-3.5" />
            {[property.location, property.area].filter(Boolean).join(", ")}
            {property.developer && <span>• {property.developer}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold" style={{ color: "oklch(0.700 0.130 75)" }}>{toCurrency(property.price)}</p>
          <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{recommendation.score}% fit</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {matchedUnits.slice(0, 3).map((unit, index) => (
          <span key={`${unit.configuration}-${index}`} className="rounded-md px-2 py-1 text-[11px]" style={{ background: "oklch(0.65 0.15 145 / 0.12)", color: "oklch(0.65 0.15 145)" }}>
            {[unit.configuration, unit.price].filter(Boolean).join(" • ")}
          </span>
        ))}
        {matchedUnits.length === 0 && getPropertyUnits(property).slice(0, 2).map((unit, index) => (
          <span key={`${unit.configuration}-${index}`} className="rounded-md px-2 py-1 text-[11px]" style={{ background: "var(--color-muted)", color: "var(--color-foreground)" }}>
            {unit.configuration}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {recommendation.match_reasons.slice(0, 3).map((reason, index) => (
          <p key={`${reason}-${index}`} className="flex items-start gap-2 text-xs" style={{ color: "var(--color-foreground)" }}>
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.65 0.15 145)" }} />
            {reason}
          </p>
        ))}
        {recommendation.warnings.slice(0, 1).map((warning, index) => (
          <p key={`${warning}-${index}`} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.72 0.15 85)" }}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {warning}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onUse}>Use for pitch</Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onOpen}>Open brief</Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCopy}>
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
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
            <StatusPill status={entry.client_status ?? entry.crm?.hwc ?? null} />
            {entry.client_anti_broker && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">
                <ShieldOff className="h-3 w-3" />Anti-Broker
              </span>
            )}
            {entry.client_construction_business_owner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-700 px-2.5 py-1 text-xs font-semibold text-white">
                <Building className="h-3 w-3" />Construction Business Owner
              </span>
            )}
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

function ActivityCard({ event }: { event: LeadActivity }) {
  const changes = Object.values(event.changes ?? {})
  const hasTransfer = event.from_user_name || event.to_user_name

  return (
    <div className="rounded-xl px-4 py-3" style={{
      border: "1px solid var(--color-border)",
      background: "var(--color-card)",
    }}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "oklch(0.700 0.130 75 / 0.12)", color: "oklch(0.700 0.130 75)" }}>
          <Activity className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
              {event.title}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">{event.source.replace(/_/g, " ")}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
            <span>{formatDateTime(event.created_at)}</span>
            {event.actor_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{event.actor_name}
              </span>
            )}
          </div>
          {event.description && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-foreground)" }}>{event.description}</p>
          )}
          {hasTransfer && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--color-foreground)" }}>
              <span>{event.from_user_name ?? "Unassigned"}</span>
              <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--color-muted-foreground)" }} />
              <span>{event.to_user_name ?? "Unassigned"}</span>
            </div>
          )}
          {changes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {changes.slice(0, 6).map(change => (
                <div key={change.label} className="grid grid-cols-[120px_1fr] gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "color-mix(in oklab, var(--color-card), var(--color-muted) 18%)" }}>
                  <span className="font-medium" style={{ color: "var(--color-foreground)" }}>{change.label}</span>
                  <span className="min-w-0" style={{ color: "var(--color-muted-foreground)" }}>
                    {displayValue(change.from)} <span className="px-1">-&gt;</span> {displayValue(change.to)}
                  </span>
                </div>
              ))}
              {changes.length > 6 && (
                <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                  +{changes.length - 6} more change(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Page

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [openedFromTrash, setOpenedFromTrash] = useState(false)

  const [lead, setLead] = useState<MetaLead | null>(null)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [history, setHistory] = useState<LeadHistory[]>([])
  const [activity, setActivity] = useState<LeadActivity[]>([])
  const [followUps, setFollowUps] = useState<LeadFollowUp[]>([])
  const [newFollowUpDate, setNewFollowUpDate] = useState<string | null>(null)
  const [newFollowUpNotes, setNewFollowUpNotes] = useState("")
  const [addingFollowUp, setAddingFollowUp] = useState(false)
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(null)
  const [completionRemarks, setCompletionRemarks] = useState<Record<string, string>>({})
  const [completionCallStatus, setCompletionCallStatus] = useState<Record<string, "spoken" | "not_spoken" | "">>({})
  const [crm, setCrm] = useState<CrmDetails>({
    first_call_date: null, last_call_date: null, call_status: null,
    not_spoken_reason: null,
    site_visit_status: null, visit_date: null, visit_confirmation_date: null,
    project_name: null,
    buying_status: null, budget_range: null, configuration: null,
    profession: null, company_name: null, current_city: null, current_area: null,
    preferred_locations: null,
    follow_up_date: null, follow_up_done: false, follow_up_remarks: null, hwc: null, remarks: null,
  })
  const [clientStatus, setClientStatus] = useState<string | null>(null)
  const [clientAntiBroker, setClientAntiBroker] = useState(false)
  const [clientConstructionBusinessOwner, setClientConstructionBusinessOwner] = useState(false)
  const [clientNote, setClientNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"crm" | "activity" | "history">("crm")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previousLeadId, setPreviousLeadId] = useState<string | null>(null)
  const [nextLeadId, setNextLeadId] = useState<string | null>(null)
  const [atPageTop, setAtPageTop] = useState(true)
  const [atPageBottom, setAtPageBottom] = useState(false)

  useEffect(() => {
    const updateScrollPosition = () => {
      const scrollTop = window.scrollY
      const viewportBottom = scrollTop + window.innerHeight
      const pageHeight = document.documentElement.scrollHeight
      setAtPageTop(scrollTop <= 80)
      setAtPageBottom(viewportBottom >= pageHeight - 80)
    }

    updateScrollPosition()
    window.addEventListener("scroll", updateScrollPosition, { passive: true })
    window.addEventListener("resize", updateScrollPosition)
    return () => {
      window.removeEventListener("scroll", updateScrollPosition)
      window.removeEventListener("resize", updateScrollPosition)
    }
  }, [loading, activeTab])
  const [propertyRecommendations, setPropertyRecommendations] = useState<PropertyRecommendation[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] = useState<PropertyRecommendation | null>(null)
  const [preferredLocationOptions, setPreferredLocationOptions] = useState<string[]>([])

  useEffect(() => {
    setIsSuperAdmin(getAuthUser()?.role === "super_admin")
    setOpenedFromTrash(new URLSearchParams(window.location.search).get("from") === "trash")
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // One request fetches the lead, its CRM, the client profile and history.
        const res = await fetch(`/api/leads/meta/${id}/detail`)
        const json = await res.json().catch(() => ({}))

        if (json.lead) setLead(json.lead)
        if (json.crm) setCrm(prev => ({ ...prev, ...json.crm }))
        if (json.client) {
          setClient(json.client)
          const status = CLIENT_STATUS_VALUES.has(json.client.status)
            ? json.client.status
            : CLIENT_STATUS_VALUES.has(json.crm?.hwc)
              ? json.crm.hwc
              : null
          setClientStatus(status)
          setClientAntiBroker(Boolean(json.client.anti_broker))
          setClientConstructionBusinessOwner(Boolean(json.client.construction_business_owner))
          setClientNote(json.client.status_note ?? "")
        }
        if (json.history) setHistory(json.history)
        if (json.activity) setActivity(json.activity)
        if (json.follow_ups) setFollowUps(json.follow_ups)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (openedFromTrash) {
      setPreviousLeadId(null)
      setNextLeadId(null)
      return
    }

    const storedOrder = readLeadQueueSnapshot()?.ids ?? []
    if (storedOrder.includes(id)) {
      const index = storedOrder.indexOf(id)
      setPreviousLeadId(index > 0 ? storedOrder[index - 1] : null)
      setNextLeadId(index < storedOrder.length - 1 ? storedOrder[index + 1] : null)
      return
    }

    fetch('/api/leads/meta').then(res => res.json()).then(json => {
      const fallbackOrder = getLeadDisplaySections(
        (json.leads ?? []) as MetaLead[],
        Date.now(),
      ).ordered.map(item => item.id)
      const ids = fallbackOrder
      const index = ids.indexOf(id)
      setPreviousLeadId(index > 0 ? ids[index - 1] : null)
      setNextLeadId(index >= 0 && index < ids.length - 1 ? ids[index + 1] : null)
    }).catch(() => { setPreviousLeadId(null); setNextLeadId(null) })
  }, [id, openedFromTrash])

  useEffect(() => {
    let cancelled = false

    async function loadPreferredLocationOptions() {
      try {
        const res = await fetch("/api/properties", { cache: "no-store" })
        const payload = await res.json().catch(() => null)
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.properties)
            ? payload.properties
            : []
        const options = Array.from(new Set(
          (rows as PropertyLocationRow[])
            .flatMap(row => [row.location, row.area])
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map(value => value.trim()),
        )).sort((a, b) => a.localeCompare(b))

        if (!cancelled) setPreferredLocationOptions(options)
      } catch {
        if (!cancelled) setPreferredLocationOptions([])
      }
    }

    void loadPreferredLocationOptions()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const hasInputs = Boolean(
      crm.budget_range ||
      crm.current_area ||
      crm.current_city ||
      (crm.preferred_locations && crm.preferred_locations.length > 0) ||
      (crm.configuration && crm.configuration.length > 0),
    )

    if (!lead || !hasInputs) {
      setPropertyRecommendations([])
      setRecommendationsError(null)
      setRecommendationsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setRecommendationsLoading(true)
      setRecommendationsError(null)

      try {
        const params = new URLSearchParams()
        if (crm.budget_range) params.set("budget_range", crm.budget_range)
        if (crm.current_area) params.set("current_area", crm.current_area)
        if (crm.current_city) params.set("current_city", crm.current_city)
        if (crm.preferred_locations?.length) params.set("preferred_locations", crm.preferred_locations.join(","))
        if (crm.configuration?.length) params.set("configuration", crm.configuration.join(","))
        params.set("limit", "6")

        const res = await fetch(`/api/leads/meta/${id}/property-recommendations?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message ?? json.error ?? "Unable to load recommendations")
        setPropertyRecommendations(Array.isArray(json.recommendations) ? json.recommendations : [])
        setShowAllRecommendations(false)
      } catch (error) {
        if (!controller.signal.aborted) {
          setPropertyRecommendations([])
          setRecommendationsError(error instanceof Error ? error.message : "Unable to load recommendations")
        }
      } finally {
        if (!controller.signal.aborted) setRecommendationsLoading(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [id, lead, crm.budget_range, crm.current_area, crm.current_city, crm.preferred_locations, crm.configuration])

  async function handleSaveAll(): Promise<boolean> {
    const missingFields: string[] = []
    if (crm.call_status === "spoken" && !clientStatus) {
      missingFields.push("Client Status is required when Call Status is Spoken")
    }
    const missingSpokenFields = missingSpokenLeadFields(crm)
    missingFields.push(...missingSpokenFields.map(field => `${SPOKEN_REQUIRED_FIELD_LABELS[field]} is required when Call Status is Spoken`))
    if (clientStatus && !BUYING_STATUS_OPTIONAL_CLIENT_STATUSES.has(clientStatus) && !crm.buying_status) {
      missingFields.push("Buying Status is required unless Client Status is Broker or Construction Owner")
    }

    if (missingFields.length > 0) {
      setActiveTab("crm")
      alert(`Please complete the required fields before saving:\n\n- ${missingFields.join("\n- ")}`)
      return false
    }

    setSaving(true)
    try {
      // Explicitly pick only the fields the API accepts to avoid DTO rejections.
      const payload = {
        call_status: crm.call_status,
        not_spoken_reason: crm.call_status === 'not_spoken' ? (crm.not_spoken_reason ?? 'did_not_pickup') : null,
        first_call_date: crm.first_call_date,
        last_call_date: crm.last_call_date,
        hwc: null,
        follow_up_date: crm.follow_up_date,
        follow_up_done: crm.follow_up_done,
        follow_up_remarks: crm.follow_up_remarks,
        buying_status: crm.buying_status,
        site_visit_status: crm.site_visit_status,
        visit_date: crm.visit_date,
        visit_confirmation_date: crm.visit_confirmation_date,
        project_name: crm.project_name,
        budget_range: crm.budget_range,
        configuration: crm.configuration,
        profession: crm.profession,
        company_name: crm.company_name,
        current_city: crm.current_city,
        current_area: crm.current_area,
        preferred_locations: crm.preferred_locations,
        remarks: crm.remarks,
      }
      // Fire the CRM save and the client-status save together instead of waiting
      // for one before starting the other.
      const [res, statusRes] = await Promise.all([
        fetch(`/api/leads/meta/${id}/crm`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        client
          ? fetch(`/api/clients/${client.id}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: clientStatus,
                status_note: clientNote,
                anti_broker: clientAntiBroker,
                construction_business_owner: clientConstructionBusinessOwner,
              }),
            })
          : Promise.resolve(null),
      ])

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = Array.isArray(json.message) ? json.message.join(", ") : (json.message ?? json.error ?? "Failed to save")
        throw new Error(msg)
      }

      if (json.lead?.crm) setCrm(prev => ({ ...prev, ...json.lead.crm }))

      if (statusRes) {
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
          setClientAntiBroker(Boolean(statusJson.client.anti_broker))
          setClientConstructionBusinessOwner(Boolean(statusJson.client.construction_business_owner))
          setClientNote(statusJson.client.status_note ?? "")
        }
      }

      const detailRes = await fetch(`/api/leads/meta/${id}/detail`)
      const detailJson = await detailRes.json().catch(() => ({}))
      if (detailJson.activity) setActivity(detailJson.activity)
      if (detailJson.history) setHistory(detailJson.history)

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return true
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save")
      return false
    } finally { setSaving(false) }
  }

  function applyFollowUps(items: LeadFollowUp[]) {
    setFollowUps(items)
    const next = items
      .filter(item => item.status === "scheduled")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
    setCrm(prev => ({ ...prev, follow_up_date: next?.scheduled_at ?? null, follow_up_done: !next }))
  }

  async function addFollowUp() {
    if (!newFollowUpDate || addingFollowUp) return
    setAddingFollowUp(true)
    try {
      const res = await fetch(`/api/leads/meta/${id}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: newFollowUpDate, notes: newFollowUpNotes.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to schedule follow-up")
      applyFollowUps(json.follow_ups ?? [])
      setNewFollowUpDate(null)
      setNewFollowUpNotes("")
      void queryClient.invalidateQueries({ queryKey: ["meta-leads"] })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to schedule follow-up")
    } finally {
      setAddingFollowUp(false)
    }
  }

  async function completeFollowUp(followUpId: string) {
    if (completingFollowUpId) return
    const callStatus = completionCallStatus[followUpId]
    if (!callStatus) {
      alert("Select Spoken or Not Spoken before completing the follow-up")
      return
    }
    setCompletingFollowUpId(followUpId)
    try {
      const res = await fetch(`/api/leads/meta/${id}/follow-ups/${followUpId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_status: callStatus,
          remarks: completionRemarks[followUpId]?.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to complete follow-up")
      applyFollowUps(json.follow_ups ?? [])
      setCompletionRemarks(prev => ({ ...prev, [followUpId]: "" }))
      setCompletionCallStatus(prev => ({ ...prev, [followUpId]: "" }))
      void queryClient.invalidateQueries({ queryKey: ["meta-leads"] })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to complete follow-up")
    } finally {
      setCompletingFollowUpId(null)
    }
  }

  async function navigateToLead(targetId: string | null) {
    if (!targetId || saving) return
    if (await handleSaveAll()) router.push(`/leads/${targetId}`)
  }

  function toggleConfig(c: string) {
    setCrm(prev => {
      const cur = prev.configuration ?? []
      return { ...prev, configuration: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] }
    })
  }

  function handleUseRecommendationForPitch(recommendation: PropertyRecommendation) {
    setCrm(prev => ({ ...prev, project_name: recommendation.property.name }))
  }

  async function copyRecommendationPitch(recommendation: PropertyRecommendation) {
    const text = recommendationPitchText(recommendation)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt("Copy pitch points", text)
    }
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
  const isClientStatusRequired = crm.call_status === "spoken"
  const isAntiBrokerEnabled = isAntiBrokerCompatibleStatus(clientStatus)
  const isBuyingStatusRequired = Boolean(
    clientStatus && !BUYING_STATUS_OPTIONAL_CLIENT_STATUSES.has(clientStatus),
  )
  const visibleRecommendations = showAllRecommendations
    ? propertyRecommendations
    : propertyRecommendations.slice(0, 3)
  const preferredLocationSelectOptions = Array.from(new Set([
    ...preferredLocationOptions,
    ...(crm.preferred_locations ?? []),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const clientStatusSection = (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-foreground)" }}>
        Client Status
        {isClientStatusRequired && <span style={{ color: "var(--color-primary)" }}> *</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {CLIENT_STATUSES.map(s => {
          const Icon = s.icon
          const active = clientStatus === s.value
          return (
            <button key={s.value}
              onClick={() => {
                const nextStatus = active ? null : s.value
                setClientStatus(nextStatus)
                if (!isAntiBrokerCompatibleStatus(nextStatus)) setClientAntiBroker(false)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={active ? { background: s.bg, color: s.color, border: `1px solid ${s.color}60` }
                : { background: "oklch(0.185 0.015 260)", color: "oklch(0.90 0.004 260)", border: "1px solid oklch(0.320 0.014 260)" }}>
              <Icon className="w-3 h-3" />{s.label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        disabled={!isAntiBrokerEnabled}
        onClick={() => setClientAntiBroker(current => !current)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={clientAntiBroker
          ? { background: "rgb(124 58 237 / 0.15)", color: "rgb(167 139 250)", border: "1px solid rgb(139 92 246 / 0.6)" }
          : { background: "oklch(0.185 0.015 260)", color: "oklch(0.90 0.004 260)", border: "1px solid oklch(0.320 0.014 260)" }}
      >
        <ShieldOff className="h-3 w-3" />Anti-Broker
      </button>
      <button
        type="button"
        onClick={() => setClientConstructionBusinessOwner(current => !current)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
        style={clientConstructionBusinessOwner
          ? { background: "rgb(14 116 144 / 0.18)", color: "rgb(103 232 249)", border: "1px solid rgb(8 145 178 / 0.65)" }
          : { background: "oklch(0.185 0.015 260)", color: "oklch(0.90 0.004 260)", border: "1px solid oklch(0.320 0.014 260)" }}
      >
        <Building className="h-3 w-3" />Construction Business Owner
      </button>
      <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
        Anti-Broker can only be combined with Hot, Warm, or Cold.
      </p>
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
    <div className="relative max-w-2xl mx-auto space-y-5 pb-24">
      <div className="absolute inset-y-0 -right-16 z-40 hidden xl:block">
        <div className="sticky top-[calc(50vh-3.25rem)] flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={atPageTop}
            className="group relative h-11 w-11 rounded-full bg-background/95 shadow-lg backdrop-blur disabled:opacity-30"
            aria-label="Go to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="h-5 w-5" />
            <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Go to top
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={atPageBottom}
            className="group relative h-11 w-11 rounded-full bg-background/95 shadow-lg backdrop-blur disabled:opacity-30"
            aria-label="Go to bottom"
            onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
          >
            <ArrowDown className="h-5 w-5" />
            <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Go to bottom
            </span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.push(openedFromTrash ? "/trash" : "/leads")}>
          <ArrowLeft className="w-4 h-4" /> {openedFromTrash ? "Back to Trash" : "Back to Leads"}
        </Button>
        <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
          {!openedFromTrash && (
            <>
          <Button variant="outline" size="sm" disabled={!previousLeadId || saving} onClick={() => navigateToLead(previousLeadId)} aria-label="Previous lead">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={!nextLeadId || saving} onClick={() => navigateToLead(nextLeadId)}>
            Next Lead <ChevronRight className="w-4 h-4" />
          </Button>
            </>
          )}
        {isSuperAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete Lead</span>
          </Button>
        )}
        </div>
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
                  <StatusPill status={clientStatus} />
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
          { key: "activity", label: `History (${activity.length})` },
          { key: "history", label: `Enquiries (${history.length})` },
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
                    <ClientProvidedField label="Profession" value={crm.profession ?? ""} placeholder="e.g. Founder, Doctor"
                      required={crm.call_status === "spoken"}
                      onChange={v => setCrm(p => ({ ...p, profession: v || null }))} />
                    <TextField label="Company" value={crm.company_name ?? ""} placeholder="e.g. Acme Corp"
                      onChange={v => setCrm(p => ({ ...p, company_name: v || null }))} />
                    <ClientProvidedField label="Current City" value={crm.current_city ?? ""} placeholder="e.g. Pune"
                      required={crm.call_status === "spoken"}
                      onChange={v => setCrm(p => ({ ...p, current_city: v || null }))} />
                    <ClientProvidedField label="Current Area" value={crm.current_area ?? ""} placeholder="e.g. Baner"
                      required={crm.call_status === "spoken"}
                      onChange={v => setCrm(p => ({ ...p, current_area: v || null }))} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-foreground)" }}>
                      Location Preference
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                      Areas where the client wants to buy. These are used first for smart recommendations.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Preferred Location</Label>
                    <SearchableSelect
                      value={crm.preferred_locations?.[0] ?? "none"}
                      onValueChange={value => setCrm(p => ({ ...p, preferred_locations: value === "none" ? null : [value] }))}
                      options={[
                        { value: "none", label: "No preference yet" },
                        ...preferredLocationSelectOptions.map(location => ({ value: location, label: location })),
                      ]}
                      placeholder="Select preferred location..."
                      searchPlaceholder="Search location..."
                      emptyMessage="No matching saved location. Type to add another area."
                      allowCustomValue
                      customOptionLabel={value => `Other location: ${value}`}
                      triggerClassName="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DateField label="First Call Date" value={crm.first_call_date ?? ""}
                    onChange={v => setCrm(p => ({ ...p, first_call_date: v || null }))} />
                  <DateField label="Last Call Date" value={crm.last_call_date ?? ""}
                    onChange={v => setCrm(p => ({ ...p, last_call_date: v || null }))} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Initial Call Status</Label>
                  <SearchableSelect
                    value={crm.call_status ?? ""}
                    onValueChange={v => setCrm(p => ({
                      ...p, call_status: v || null,
                      not_spoken_reason: v === 'not_spoken' ? (p.not_spoken_reason ?? 'did_not_pickup') : null,
                      site_visit_status: null, visit_date: null, visit_confirmation_date: null
                    }))}
                    options={CALL_STATUS_OPTIONS}
                    placeholder="Select status..."
                    searchPlaceholder="Search status..."
                    triggerClassName="h-9 text-sm"
                  />
                  <p className="text-[11px] leading-4" style={{ color: "var(--color-muted-foreground)" }}>
                    Lead queue shifting uses this initial Spoken / Not Spoken status. Follow-up call outcomes do not change it.
                  </p>
                </div>

                {crm.call_status === 'not_spoken' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reason for Not Spoken</Label>
                    <SearchableSelect
                      value={crm.not_spoken_reason ?? 'did_not_pickup'}
                      onValueChange={v => setCrm(p => ({ ...p, not_spoken_reason: v }))}
                      options={NOT_SPOKEN_REASON_OPTIONS}
                      placeholder="Select reason..."
                      searchPlaceholder="Search reason..."
                      triggerClassName="h-9 text-sm"
                    />
                  </div>
                )}

                {showSiteVisit && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Site Visit Status</Label>
                      <SearchableSelect
                        value={crm.site_visit_status ?? ""}
                        onValueChange={v => setCrm(p => ({
                          ...p, site_visit_status: v || null, visit_date: null, visit_confirmation_date: null
                        }))}
                        options={SITE_VISIT_STATUS_OPTIONS}
                        placeholder="Select visit status..."
                        searchPlaceholder="Search visit status..."
                        triggerClassName="h-9 text-sm"
                      />
                    </div>
                    {showVisitDate && (
                      <DateTimeField label="Visit Date & Time" value={crm.visit_date}
                        onChange={v => setCrm(p => ({ ...p, visit_date: v }))} />
                    )}
                    {showConfirmDate && (
                      <>
                        <DateTimeField label="Confirmation Date & Time" value={crm.visit_confirmation_date}
                          onChange={v => setCrm(p => ({ ...p, visit_confirmation_date: v }))} />
                        <TextField label="Project Name" value={crm.project_name ?? ''} placeholder="Project being visited"
                          onChange={v => setCrm(p => ({ ...p, project_name: v || null }))} />
                      </>
                    )}
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
                    Buying Status
                    {isBuyingStatusRequired && <span style={{ color: "var(--color-primary)" }}> *</span>}
                  </Label>
                  <SearchableSelect
                    value={crm.buying_status ?? ""}
                    onValueChange={v => setCrm(p => ({ ...p, buying_status: v || null }))}
                    options={BUYING_STATUS_OPTIONS}
                    placeholder="Select buying status..."
                    searchPlaceholder="Search buying status..."
                    triggerClassName="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
                    Budget{crm.call_status === "spoken" && <span style={{ color: "var(--color-primary)" }}> *</span>}
                  </Label>
                  <SearchableSelect
                    value={crm.budget_range ?? ""}
                    onValueChange={v => setCrm(p => ({ ...p, budget_range: v || null }))}
                    options={BUDGET_OPTIONS.map(option => ({ value: option, label: option }))}
                    placeholder="Select budget..."
                    searchPlaceholder="Search budget..."
                    triggerClassName="h-9 text-sm"
                  />
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

                <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "color-mix(in oklab, var(--color-card), var(--color-muted) 10%)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" style={{ color: "oklch(0.700 0.130 75)" }} />
                        <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>Smart Recommendations</p>
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                        Live matches from property inventory. Confirm latest availability before commitment.
                      </p>
                    </div>
                    {recommendationsLoading && (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Matching
                      </span>
                    )}
                  </div>

                  {recommendationsError && (
                    <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "oklch(0.60 0.12 20 / 0.35)", color: "oklch(0.60 0.12 20)" }}>
                      {recommendationsError}
                    </div>
                  )}

                  {!recommendationsLoading && !recommendationsError && propertyRecommendations.length === 0 && (
                    <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
                      Select a budget and configuration to see matched properties.
                    </div>
                  )}

                  {visibleRecommendations.length > 0 && (
                    <div className="space-y-3">
                      {visibleRecommendations.map(recommendation => (
                        <RecommendationCard
                          key={recommendation.property.id}
                          recommendation={recommendation}
                          onUse={() => handleUseRecommendationForPitch(recommendation)}
                          onOpen={() => setSelectedRecommendation(recommendation)}
                          onCopy={() => void copyRecommendationPitch(recommendation)}
                        />
                      ))}
                    </div>
                  )}

                  {propertyRecommendations.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowAllRecommendations(value => !value)}
                    >
                      {showAllRecommendations ? "Show top 3" : `View ${propertyRecommendations.length - 3} more`}
                    </Button>
                  )}
                </div>

                <div className="space-y-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Client Follow-ups</p>
                    <p className="text-xs text-muted-foreground">
                      Schedule multiple follow-ups and keep every completed conversation in the client history. Spoken / Not Spoken here is a follow-up outcome only and does not shift the lead.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                    <FollowUpDateTimeFields label="Schedule Follow-up" value={newFollowUpDate} onChange={setNewFollowUpDate} />
                    <div className="space-y-1.5">
                      <Label className="text-xs">Plan / reason</Label>
                      <Textarea
                        value={newFollowUpNotes}
                        placeholder="What should be discussed in this follow-up?"
                        className="min-h-[70px]"
                        onChange={event => setNewFollowUpNotes(event.target.value)}
                      />
                    </div>
                    <Button type="button" size="sm" onClick={addFollowUp} disabled={!newFollowUpDate || addingFollowUp}>
                      {addingFollowUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                      Add Follow-up
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {followUps.length === 0 ? (
                      <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                        No follow-ups logged yet.
                      </p>
                    ) : [...followUps].sort((a, b) => {
                      if (a.status === "scheduled" && b.status !== "scheduled") return -1
                      if (a.status !== "scheduled" && b.status === "scheduled") return 1
                      if (a.status === "scheduled") {
                        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                      }
                      return new Date(b.completed_at ?? b.updated_at).getTime() - new Date(a.completed_at ?? a.updated_at).getTime()
                    }).map(item => (
                      <div key={item.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{formatDateTime(item.scheduled_at)}</p>
                            </div>
                            {item.notes && <p className="mt-1 text-xs text-muted-foreground">Plan: {item.notes}</p>}
                          </div>
                          <Badge variant={item.status === "scheduled" ? "secondary" : "outline"} className="capitalize">
                            {item.status}
                          </Badge>
                        </div>

                        {item.status === "scheduled" ? (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Call outcome</Label>
                              <select
                                value={completionCallStatus[item.id] ?? ""}
                                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
                                style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                                onChange={event => setCompletionCallStatus(prev => ({
                                  ...prev,
                                  [item.id]: event.target.value as "spoken" | "not_spoken" | "",
                                }))}
                              >
                                <option value="">Select call outcome</option>
                                <option value="spoken">Spoken</option>
                                <option value="not_spoken">Not Spoken</option>
                              </select>
                              <p className="text-[11px] leading-4 text-muted-foreground">
                                This records the follow-up only; lead shifting still uses the initial call status above.
                              </p>
                            </div>
                            <Textarea
                              value={completionRemarks[item.id] ?? ""}
                              placeholder="Outcome / remarks from this follow-up"
                              className="min-h-[64px]"
                              onChange={event => setCompletionRemarks(prev => ({ ...prev, [item.id]: event.target.value }))}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => completeFollowUp(item.id)}
                              disabled={completingFollowUpId === item.id || !completionCallStatus[item.id]}
                            >
                              {completingFollowUpId === item.id
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : <Check className="mr-2 h-4 w-4" />}
                              Mark Completed
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3 border-t pt-3 text-xs">
                            <p>
                              <span className="font-medium">Call:</span>{" "}
                              {item.call_status === "spoken" ? "Spoken" : item.call_status === "not_spoken" ? "Not Spoken" : "Not recorded"}
                            </p>
                            <p><span className="font-medium">Outcome:</span> {item.outcome_remarks || "No remarks added"}</p>
                            {item.completed_at && (
                              <p className="mt-1 text-muted-foreground">
                                Completed {formatDateTime(item.completed_at)}{item.completed_by_name ? ` by ${item.completed_by_name}` : ""}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

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

        {/* Activity tab */}
        {activeTab === "activity" && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: "oklch(0.700 0.130 75)" }} />
                  Lead History
                </CardTitle>
                <p className="text-xs mt-1" style={{ color: "var(--color-foreground)" }}>
                  Assignments, transfers, CRM changes, client status updates and site visits
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {activity.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "var(--color-foreground)" }}>
                    No activity recorded yet
                  </p>
                ) : (
                  activity.map(event => <ActivityCard key={event.id} event={event} />)
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Enquiries tab */}
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

      <Dialog open={!!selectedRecommendation} onOpenChange={open => !open && setSelectedRecommendation(null)}>
        <DialogContent className="max-w-3xl">
          {selectedRecommendation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  {selectedRecommendation.property.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-lg font-semibold">{selectedRecommendation.score}% fit</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-lg font-semibold">{toCurrency(selectedRecommendation.property.price)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold capitalize">{selectedRecommendation.property.status}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Sample House</p>
                    <p className="text-lg font-semibold">{propertySampleHouse(selectedRecommendation.property) ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Why it matched</h3>
                    {selectedRecommendation.match_reasons.map((reason, index) => (
                      <p key={`${reason}-${index}`} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {reason}
                      </p>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Pitch points</h3>
                    {selectedRecommendation.pitch_points.map((point, index) => (
                      <p key={`${point}-${index}`} className="text-sm text-muted-foreground">{point}</p>
                    ))}
                  </div>
                </div>

                {selectedRecommendation.matched_units.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Matched units</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedRecommendation.matched_units.map((unit, index) => (
                        <div key={`${unit.configuration}-${index}`} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{unit.configuration}</p>
                          <p className="text-muted-foreground">
                            {[unit.price, unit.area_sqft ? `${unit.area_sqft} sqft` : null, unit.carpet_area_sqft ? `${unit.carpet_area_sqft} carpet` : null]
                              .filter(Boolean)
                              .join(" | ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRecommendation.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    {selectedRecommendation.warnings.map((warning, index) => (
                      <p key={`${warning}-${index}`} className="flex items-start gap-2 text-sm text-amber-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleUseRecommendationForPitch(selectedRecommendation)}>
                    Use for pitch
                  </Button>
                  <Button variant="outline" onClick={() => void copyRecommendationPitch(selectedRecommendation)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy pitch points
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 gap-2 xl:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={atPageTop}
          className="h-11 w-11 rounded-full bg-background/95 shadow-lg backdrop-blur disabled:opacity-30"
          aria-label="Go to top"
          title="Go to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={atPageBottom}
          className="h-11 w-11 rounded-full bg-background/95 shadow-lg backdrop-blur disabled:opacity-30"
          aria-label="Go to bottom"
          title="Go to bottom"
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>

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
