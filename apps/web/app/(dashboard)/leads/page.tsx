"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useMetaLeads } from "@/hooks/use-meta-leads"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Users, Phone, MapPin, Flame,
  Thermometer, Snowflake, ChevronRight, Loader2, AlertCircle,
  RefreshCw, Calendar, Star, Download, Filter, X, Plus
} from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { getAuthUser } from "@/lib/auth/cookies"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { AddLeadDialog } from "@/components/add-lead-dialog"
import { exportLeadsToExcel } from "@/lib/export-leads"
import { campaignOptions, EMPTY_LEAD_FILTERS, filterLeadList } from "@/lib/lead-list-filter"
import {
  dateKey,
  getLeadDisplaySections,
  isFreshLead,
} from "@/lib/lead-display-order"

interface Crm {
  first_call_date?: string | null
  last_call_date?: string | null
  call_status: string | null
  hwc: string | null
  follow_up_date: string | null
  buying_status: string | null
  site_visit_status?: string | null
  visit_date?: string | null
  visit_confirmation_date?: string | null
  budget_range?: string | null
  configuration?: string[] | null
  profession?: string | null
  company_name?: string | null
  current_city?: string | null
  current_area?: string | null
  remarks?: string | null
  updated_at?: string | null
}

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: string
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string } | null
  crm?: Crm | null
  client_status?: string | null
  client_status_note?: string | null
  today_follow_up_calls?: Array<{
    id: string
    call_status: "spoken" | "not_spoken"
    completed_at: string
    completed_by_profile: { id: string; full_name: string } | null
  }>
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
  return isFreshLead(lead)
}

const CLIENT_STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hot:                    { label: "Hot",               icon: Flame,        color: "oklch(0.75 0.18 35)"  },
  warm:                   { label: "Warm",              icon: Thermometer,  color: "oklch(0.78 0.15 65)"  },
  cold:                   { label: "Cold",              icon: Snowflake,    color: "oklch(0.65 0.15 250)" },
  postponed:              { label: "Postponed",         icon: Calendar,     color: "oklch(0.68 0.12 285)" },
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

const EMPTY_LEADS: MetaLead[] = []

export default function LeadsPage() {
  const {
    data,
    isLoading: loading,
    isFetching: refreshing,
    error: queryError,
    refetch,
  } = useMetaLeads<MetaLead>()
  const {
    data: callStatsData,
    isLoading: callStatsLoading,
    refetch: refetchCallStats,
  } = useMetaLeads<MetaLead>(undefined, { includePools: true })
  const leads = data ?? EMPTY_LEADS
  const callStatsLeads = callStatsData ?? EMPTY_LEADS
  const error = queryError ? (queryError instanceof Error ? queryError.message : "Unknown error") : null
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({ ...EMPTY_LEAD_FILTERS })
  const [showFilters, setShowFilters] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [addOpen, setAddOpen] = useState(false)
  const isSuperAdmin = getAuthUser()?.role === "super_admin"

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("quickAdd") === "lead") setAddOpen(true)
  }, [])

  // Unique executives present in the data (for the assigned-to filter)
  const execs = useMemo(() => {
    const map = new Map<string, string>()
    leads.forEach(l => {
      if (l.assigned_to_profile) map.set(l.assigned_to_profile.id, l.assigned_to_profile.full_name)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [leads])

  const campaigns = useMemo(() => campaignOptions(leads), [leads])

  function setFilter(key: keyof typeof EMPTY_LEAD_FILTERS, value: string) {
    setFilters(p => ({ ...p, [key]: value }))
  }
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const filtered = useMemo(() => filterLeadList(leads, search, filters), [leads, search, filters])

  const handleExport = useCallback(() => {
    if (!isSuperAdmin) return
    const campaignSuffix = filters.campaign
      ? `-${filters.campaign.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
      : ""
    exportLeadsToExcel(filtered, `leads${campaignSuffix}`)
  }, [filtered, filters.campaign, isSuperAdmin])

  const handleLeadAdded = useCallback(() => {
    void refetch()
    void refetchCallStats()
  }, [refetch, refetchCallStats])

  const today = dateKey(new Date(now))

  // Completed follow-ups are counted from their durable per-attempt log. For a
  // lead with no completed follow-up today, retain the normal CRM call path.
  const todayCallStats = useMemo(() => {
    function calledToday(lead: MetaLead) {
      const crm = lead.crm
      if (!crm?.call_status) return false
      return [crm.first_call_date, crm.last_call_date]
        .some(date => dateKey(date) === today)
    }

    const byExec = new Map<string, { id: string; name: string; spoken: number; notSpoken: number; callBack: number }>()
    let totalSpoken = 0
    let totalNotSpoken = 0
    let totalCallBack = 0

    function recordCall(
      status: string | null | undefined,
      exec: { id: string; full_name: string } | null,
    ) {
      const execId = exec?.id ?? "unassigned"
      if (!byExec.has(execId)) byExec.set(execId, {
        id: execId,
        name: exec?.full_name ?? "Unassigned",
        spoken: 0,
        notSpoken: 0,
        callBack: 0,
      })
      const s = byExec.get(execId)!
      if (status === "spoken") { s.spoken++; totalSpoken++ }
      if (status === "not_spoken") { s.notSpoken++; totalNotSpoken++ }
      if (status === "call_back_later") { s.callBack++; totalCallBack++ }
    }

    callStatsLeads.forEach(lead => {
      const followUpCalls = lead.today_follow_up_calls ?? []
      if (followUpCalls.length > 0) {
        followUpCalls.forEach(call => recordCall(
          call.call_status,
          call.completed_by_profile ?? lead.assigned_to_profile,
        ))
        return
      }
      if (!calledToday(lead)) return
      recordCall(lead.crm?.call_status, lead.assigned_to_profile)
    })

    const execList = Array.from(byExec.values())
      .sort((a, b) => (b.spoken + b.notSpoken + b.callBack) - (a.spoken + a.notSpoken + a.callBack))

    return {
      execList,
      totalSpoken,
      totalNotSpoken,
      totalCallBack,
      totalCalls: totalSpoken + totalNotSpoken + totalCallBack,
    }
  }, [callStatsLeads, today])

  // This is the exact order rendered on the page and used by the lead-detail
  // Previous/Next buttons when a sales executive opens a lead from here.
  const { dueToday, overdue, rest, ordered } = useMemo(
    () => getLeadDisplaySections(filtered, now),
    [filtered, now],
  )

  useEffect(() => {
    window.sessionStorage.setItem(
      "pikorua.leads.visibleOrder",
      JSON.stringify(ordered.map(lead => lead.id)),
    )
  }, [ordered])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {filtered.length} of {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            size="sm"
            className="gap-2 gold-gradient font-semibold shadow-gold-sm"
            style={{ color: "var(--color-primary-foreground)" }}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" className="gap-2"
              onClick={handleExport}
              disabled={filtered.length === 0}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetch()} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Total", value: leads.length, color: "var(--color-primary)" },
          { label: "Follow-up Today", value: dueToday.length, color: "var(--color-warning)" },
          { label: "Overdue", value: overdue.length, color: "var(--color-destructive)" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-3 sm:p-4">
              <p className="mb-1 text-[11px] font-medium leading-tight sm:text-xs" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
              <p className="text-xl font-bold sm:text-2xl" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Call Stats */}
      {!callStatsLoading && (todayCallStats.totalCalls > 0 || isSuperAdmin) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wider uppercase px-1" style={{ color: "var(--color-muted-foreground)" }}>
            Today&apos;s Call Activity
          </p>
          {isSuperAdmin ? (
            <Card className="shadow-card">
              <CardContent className="overflow-x-auto p-0">
                <div className="grid gap-3 px-4 py-2 text-[11px] font-semibold"
                  style={{ gridTemplateColumns: "minmax(120px, 1fr) 72px 88px 80px 64px", borderBottom: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }}>
                  <span>Executive</span>
                  <span className="text-center">Spoken</span>
                  <span className="text-center">Not Spoken</span>
                  <span className="text-center">Call Back</span>
                  <span className="text-center">Total</span>
                </div>
                {todayCallStats.execList.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "var(--color-muted-foreground)" }}>No calls logged today</p>
                ) : (
                  <>
                    {todayCallStats.execList.map(exec => (
                      <div key={exec.id}
                        className="grid gap-3 px-4 py-2.5 items-center"
                        style={{ gridTemplateColumns: "minmax(120px, 1fr) 72px 88px 80px 64px", borderBottom: "1px solid var(--color-border)" }}>
                        <span className="text-xs font-medium truncate" style={{ color: "var(--color-foreground)" }}>{exec.name}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-success, oklch(0.65 0.18 145))" }}>{exec.spoken}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-destructive)" }}>{exec.notSpoken}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-primary)" }}>{exec.callBack}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-foreground)" }}>{exec.spoken + exec.notSpoken + exec.callBack}</span>
                      </div>
                    ))}
                    {todayCallStats.execList.length > 1 && (
                      <div className="grid gap-3 px-4 py-2.5 items-center rounded-b-xl"
                        style={{ gridTemplateColumns: "minmax(120px, 1fr) 72px 88px 80px 64px", background: "var(--color-muted, oklch(0.96 0 0))" }}>
                        <span className="text-xs font-semibold" style={{ color: "var(--color-foreground)" }}>Total</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-success, oklch(0.65 0.18 145))" }}>{todayCallStats.totalSpoken}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-destructive)" }}>{todayCallStats.totalNotSpoken}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-primary)" }}>{todayCallStats.totalCallBack}</span>
                        <span className="text-sm font-bold text-center" style={{ color: "var(--color-foreground)" }}>{todayCallStats.totalCalls}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Spoken Today</p>
                  <p className="text-2xl font-bold" style={{ color: "oklch(0.65 0.18 145)" }}>{todayCallStats.totalSpoken}</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Not Spoken Today</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-destructive)" }}>{todayCallStats.totalNotSpoken}</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Call Back Today</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{todayCallStats.totalCallBack}</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Leads Called Today</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{todayCallStats.totalCalls}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Search + filter toggle */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
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
              <FilterSelect value={filters.clientStatus} onChange={v => setFilter("clientStatus", v)}>
                <option value="">All Client Status</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="postponed">Postponed</option>
                <option value="lost">Lost</option>
              </FilterSelect>
              <FilterSelect value={filters.callStatus} onChange={v => setFilter("callStatus", v)}>
                <option value="">All Call Status</option>
                <option value="fresh">Fresh (unspoken)</option>
                <option value="spoken">Spoken</option>
                <option value="not_spoken">Not Spoken</option>
                <option value="call_back_later">Call Back Later</option>
              </FilterSelect>
              <FilterSelect value={filters.campaign} onChange={v => setFilter("campaign", v)}>
                <option value="">All Campaigns</option>
                {campaigns.map(campaign => <option key={campaign} value={campaign}>{campaign}</option>)}
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
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:flex">
                <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>Received</span>
                <input type="date" value={filters.dateFrom} onChange={e => setFilter("dateFrom", e.target.value)}
                  className="h-9 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
                <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>to</span>
                <input type="date" value={filters.dateTo} onChange={e => setFilter("dateTo", e.target.value)}
                  className="h-9 rounded-lg px-2 text-xs bg-transparent" style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-1 h-9 text-xs" onClick={() => setFilters({ ...EMPTY_LEAD_FILTERS })}>
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
        <div className="text-center py-20 space-y-3">
          <Users className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            {search || activeFilterCount > 0 ? "No leads match your filters" : "No leads assigned yet"}
          </p>
          {!search && activeFilterCount === 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 mx-auto"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add your first lead manually
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {dueToday.length > 0 && <Section title="Follow up Today" accentColor="var(--color-warning)" leads={dueToday} />}
          {overdue.length > 0 && <Section title="Overdue Follow-ups" accentColor="var(--color-destructive)" leads={overdue} />}
          {rest.length > 0 && <Section title={overdue.length + dueToday.length > 0 ? "Others" : "All Leads"} accentColor="var(--color-primary)" leads={rest} />}
        </div>
      )}

      <AddLeadDialog<MetaLead>
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleLeadAdded}
      />
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
              <div className="flex flex-col gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 hover:scale-[1.005] cursor-pointer sm:flex-row sm:items-center sm:gap-4"
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
                      <ProtectedPhone value={lead.phone} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        <Phone className="w-3 h-3" />{formatPhone(lead.phone)}
                      </ProtectedPhone>
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
                <div className="w-full shrink-0 space-y-1 min-w-0 sm:w-auto sm:text-right">
                  {lead.assigned_to_profile && (
                    <div className="flex items-center gap-1.5 sm:justify-end">
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
                    <p className="flex items-center gap-1 text-[10px] sm:justify-end" style={{ color: "var(--color-muted-foreground)" }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.crm.follow_up_date).toLocaleString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                  {!lead.assigned_to_profile && !lead.crm?.call_status && (
                    <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                      {timeAgo(lead.received_at)}
                    </p>
                  )}
                </div>

                <ChevronRight className="hidden w-4 h-4 shrink-0 sm:block" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
