"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Users, Phone, MapPin, Flame,
  Thermometer, Snowflake, ChevronRight, Loader2, AlertCircle,
  RefreshCw, Calendar, Star, Download, Filter, X
} from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { exportLeadsToExcel } from "@/lib/export-leads"

interface Crm {
  call_status: string | null
  hwc: string | null
  follow_up_date: string | null
  buying_status: string | null
  profession?: string | null
  current_city?: string | null
  current_area?: string | null
}

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: "unassigned" | "assigned" | "cold_pool"
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string } | null
  crm?: Crm | null
  client_status?: string | null
}

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// A lead is "fresh" until it has been marked spoken
function isFresh(lead: MetaLead) {
  return lead.crm?.call_status !== "spoken"
}

const CLIENT_STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hot:                    { label: "Hot",               icon: Flame,        color: "oklch(0.75 0.18 35)"  },
  warm:                   { label: "Warm",              icon: Thermometer,  color: "oklch(0.78 0.15 65)"  },
  cold:                   { label: "Cold",              icon: Snowflake,    color: "oklch(0.65 0.15 250)" },
  lost:                   { label: "Lost",              icon: Star,         color: "oklch(0.60 0.12 20)"  },
  low_budget:             { label: "Low Budget",        icon: Filter,       color: "oklch(0.72 0.15 85)"  },
  not_interested:         { label: "Not Interested",    icon: X,            color: "oklch(0.55 0.08 260)" },
  broker:                 { label: "Broker",            icon: Users,        color: "oklch(0.65 0.15 145)" },
  construction_biz_owner: { label: "Const. Owner",      icon: Users,        color: "oklch(0.65 0.12 200)" },
}

function ClientStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const m = CLIENT_STATUS_MAP[status]
  if (!m) return null
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
      style={{ background: m.color, color: "#fff" }}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  )
}

function CallStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const map: Record<string, { label: string; color: string }> = {
    spoken: { label: "Spoken", color: "var(--color-success)" },
    not_spoken: { label: "Not Spoken", color: "var(--color-destructive)" },
    call_back_later: { label: "Call Back", color: "var(--color-primary)" },
  }
  const m = map[status]
  if (!m) return null
  return <span className="text-[10px] font-medium" style={{ color: m.color }}>{m.label}</span>
}

// Compact styled native select
function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-lg px-2.5 text-xs bg-transparent cursor-pointer"
      style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
    >
      {children}
    </select>
  )
}

const EMPTY_FILTERS = {
  hwc: "", callStatus: "", source: "", assignedTo: "", dateFrom: "", dateTo: "",
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<MetaLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const [showFilters, setShowFilters] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/meta")
      if (!res.ok) throw new Error("Failed to load leads")
      const json = await res.json()
      // Supabase returns the embedded crm as an array; normalize to a single object
      const normalized: MetaLead[] = (json.leads ?? []).map((l: MetaLead & { crm?: Crm | Crm[] | null }) => ({
        ...l,
        crm: Array.isArray(l.crm) ? (l.crm[0] ?? null) : (l.crm ?? null),
      }))
      setLeads(normalized)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Unique executives present in the data (for the assigned-to filter)
  const execs = useMemo(() => {
    const map = new Map<string, string>()
    leads.forEach(l => {
      if (l.assigned_to_profile) map.set(l.assigned_to_profile.id, l.assigned_to_profile.full_name)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [leads])

  function setFilter(key: keyof typeof EMPTY_FILTERS, value: string) {
    setFilters(p => ({ ...p, [key]: value }))
  }
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const filtered = useMemo(() => leads.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      const hit = l.full_name?.toLowerCase().includes(q)
        || l.phone?.toLowerCase().includes(q)
        || l.email?.toLowerCase().includes(q)
        || l.city?.toLowerCase().includes(q)
        || l.campaign_name?.toLowerCase().includes(q)
      if (!hit) return false
    }
    if (filters.hwc && (l.crm?.hwc ?? "") !== filters.hwc) return false
    if (filters.callStatus) {
      if (filters.callStatus === "fresh" && !isFresh(l)) return false
      if (filters.callStatus !== "fresh" && (l.crm?.call_status ?? "") !== filters.callStatus) return false
    }
    if (filters.source && l.source !== filters.source) return false
    if (filters.assignedTo && l.assigned_to_profile?.id !== filters.assignedTo) return false
    if (filters.dateFrom && l.received_at < filters.dateFrom) return false
    if (filters.dateTo && l.received_at > filters.dateTo + "T23:59:59") return false
    return true
  }), [leads, search, filters])

  // Surface leads the exec hasn't acted on yet: anything without a logged call
  // status sorts to the top so fresh leads are the first thing they see.
  // (Stable sort keeps the server's received-date order within each group.)
  const interactionSorted = useMemo(() => {
    const contacted = (l: MetaLead) => (l.crm?.call_status ? 1 : 0)
    return [...filtered].sort((a, b) => contacted(a) - contacted(b))
  }, [filtered])

  // Group by follow-up urgency
  const today = new Date().toISOString().split("T")[0]
  const overdue = interactionSorted.filter(l => l.crm?.follow_up_date && l.crm.follow_up_date < today)
  const dueToday = interactionSorted.filter(l => l.crm?.follow_up_date === today)
  const rest = interactionSorted.filter(l => !l.crm?.follow_up_date || l.crm.follow_up_date > today)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {filtered.length} of {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => exportLeadsToExcel(filtered, "leads")}
            disabled={filtered.length === 0}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchLeads} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: leads.length, color: "var(--color-primary)" },
          { label: "Follow-up Today", value: dueToday.length, color: "var(--color-warning)" },
          { label: "Overdue", value: overdue.length, color: "var(--color-destructive)" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setShowFilters(p => !p)}>
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
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <FilterSelect value={filters.hwc} onChange={v => setFilter("hwc", v)}>
                <option value="">All HWC</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </FilterSelect>
              <FilterSelect value={filters.callStatus} onChange={v => setFilter("callStatus", v)}>
                <option value="">All Call Status</option>
                <option value="fresh">Fresh (unspoken)</option>
                <option value="spoken">Spoken</option>
                <option value="not_spoken">Not Spoken</option>
                <option value="call_back_later">Call Back Later</option>
              </FilterSelect>
              <FilterSelect value={filters.source} onChange={v => setFilter("source", v)}>
                <option value="">All Sources</option>
                <option value="meta_ad">Meta Ad</option>
                <option value="manual">Manual</option>
                <option value="migrated">Migrated</option>
              </FilterSelect>
              {execs.length > 0 && (
                <FilterSelect value={filters.assignedTo} onChange={v => setFilter("assignedTo", v)}>
                  <option value="">All Executives</option>
                  {execs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </FilterSelect>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>Received</span>
                <input type="date" value={filters.dateFrom} onChange={e => setFilter("dateFrom", e.target.value)}
                  className="h-9 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
                <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>to</span>
                <input type="date" value={filters.dateTo} onChange={e => setFilter("dateTo", e.target.value)}
                  className="h-9 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-1 h-9 text-xs" onClick={() => setFilters({ ...EMPTY_FILTERS })}>
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <Users className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            {search || activeFilterCount > 0 ? "No leads match your filters" : "No leads assigned yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && <Section title="Overdue Follow-ups" accentColor="var(--color-destructive)" leads={overdue} />}
          {dueToday.length > 0 && <Section title="Follow up Today" accentColor="var(--color-warning)" leads={dueToday} />}
          {rest.length > 0 && <Section title={overdue.length + dueToday.length > 0 ? "Others" : "All Leads"} accentColor="var(--color-primary)" leads={rest} />}
        </div>
      )}
    </div>
  )
}

function Section({ title, accentColor, leads }: { title: string; accentColor: string; leads: MetaLead[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wider uppercase px-1" style={{ color: accentColor }}>
        {title} ({leads.length})
      </p>
      <AnimatePresence initial={false}>
        {leads.map((lead, i) => (
          <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link href={`/leads/${lead.id}`}>
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-150 hover:scale-[1.005] cursor-pointer"
                style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-xs gold-gradient" style={{ color: "var(--color-primary-foreground)" }}>
                    {initials(lead.full_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isFresh(lead) && (
                      <Star className="w-3.5 h-3.5 shrink-0 fill-current" style={{ color: "var(--color-primary)" }} />
                    )}
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-foreground)" }}>
                      {lead.full_name ?? "Unknown"}
                    </p>
                    <ClientStatusBadge status={lead.client_status} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        <Phone className="w-3 h-3" />{formatPhone(lead.phone)}
                      </span>
                    )}
                    {lead.city && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        <MapPin className="w-3 h-3" />{lead.city}
                      </span>
                    )}
                    {lead.campaign_name && (
                      <span className="text-[11px] truncate" style={{ color: "var(--color-primary)" }}>
                        {lead.campaign_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="shrink-0 text-right space-y-1 min-w-0">
                  {lead.assigned_to_profile && (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[11px] truncate max-w-[100px]" style={{ color: "oklch(0.65 0.15 145)" }}>
                        {lead.assigned_to_profile.full_name}
                      </span>
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarFallback className="text-[8px] font-bold"
                          style={{ background: "oklch(0.65 0.15 145 / 0.2)", color: "oklch(0.65 0.15 145)" }}>
                          {initials(lead.assigned_to_profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <CallStatusBadge status={lead.crm?.call_status} />
                  {lead.crm?.follow_up_date && (
                    <p className="flex items-center justify-end gap-1 text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.crm.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  )}
                  {!lead.assigned_to_profile && !lead.crm?.call_status && (
                    <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                      {timeAgo(lead.received_at)}
                    </p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
