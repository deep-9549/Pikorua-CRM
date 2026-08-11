"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useMetaLeads } from "@/hooks/use-meta-leads"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Users, Phone, MapPin, Flame,
  Thermometer, Snowflake, ChevronRight, Loader2, AlertCircle,
  RefreshCw, Calendar, Star, Download, Filter, X, Plus, ShieldOff
} from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { getAuthUser } from "@/lib/auth/cookies"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MetricGroup, MetricItem, PageHeader, SectionHeader, SectionPanel, WorkspacePage } from "@/components/ui/workspace"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { AddLeadDialog } from "@/components/add-lead-dialog"
import { exportLeadsToExcel } from "@/lib/export-leads"
import { campaignOptions, EMPTY_LEAD_FILTERS, filterLeadList } from "@/lib/lead-list-filter"
import {
  dateKey,
  getLeadDisplaySections,
  isFreshLead,
  isFreshlyAssignedLead,
} from "@/lib/lead-display-order"
import {
  readLeadListViewState,
  writeLeadListViewState,
  writeLeadQueueSnapshot,
  type LeadTab,
} from "@/lib/lead-list-state"

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
  assignment_viewed_at: string | null
  assigned_to_profile: { id: string; full_name: string } | null
  crm?: Crm | null
  client_status?: string | null
  client_status_note?: string | null
  client_anti_broker?: boolean
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

const CLIENT_STATUS_MAP: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  hot:                    { label: "Hot",            icon: Flame,       className: "bg-lead-hot/10 text-lead-hot" },
  warm:                   { label: "Warm",           icon: Thermometer, className: "bg-lead-warm/10 text-lead-warm" },
  cold:                   { label: "Cold",           icon: Snowflake,   className: "bg-lead-cold/10 text-lead-cold" },
  postponed:              { label: "Postponed",      icon: Calendar,    className: "bg-info/10 text-info" },
  lost:                   { label: "Lost",           icon: Star,        className: "bg-destructive/10 text-destructive" },
  low_budget:             { label: "Low budget",     icon: Filter,      className: "bg-warning/10 text-warning" },
  not_interested:         { label: "Not interested", icon: X,           className: "bg-muted text-muted-foreground" },
  broker:                 { label: "Broker",         icon: Users,       className: "bg-primary/10 text-primary" },
  construction_biz_owner: { label: "Const. owner",   icon: Users,       className: "bg-secondary text-secondary-foreground" },
}

function ClientStatusBadge({ status, antiBroker }: { status: string | null | undefined; antiBroker?: boolean }) {
  const m = status ? CLIENT_STATUS_MAP[status] : undefined
  const Icon = m?.icon
  return (
    <>
      {m && Icon && (
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${m.className}`}>
          <Icon className="w-2.5 h-2.5" />{m.label}
        </span>
      )}
      {antiBroker && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
          <ShieldOff className="w-2.5 h-2.5" />Anti-Broker
        </span>
      )}
    </>
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
      className="h-11 cursor-pointer rounded-lg bg-card px-2.5 text-xs sm:h-9"
      style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
    >
      {children}
    </select>
  )
}

const EMPTY_LEADS: MetaLead[] = []
type CallListStatus = "spoken" | "not_spoken" | "call_back_later"
type CallListEntry = { key: string; lead: MetaLead }

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
  const [activeTab, setActiveTab] = useState<LeadTab>("leads")
  const [viewStateHydrated, setViewStateHydrated] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [addOpen, setAddOpen] = useState(false)
  const [callListStatus, setCallListStatus] = useState<CallListStatus | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const displayRefreshing = !viewStateHydrated || refreshing

  useEffect(() => {
    setIsSuperAdmin(getAuthUser()?.role === "super_admin")
    const restored = readLeadListViewState()
    setSearch(restored.search)
    setFilters(restored.filters)
    setShowFilters(restored.showFilters)
    setActiveTab(restored.activeTab)
    setViewStateHydrated(true)
  }, [])

  useEffect(() => {
    if (!viewStateHydrated) return
    writeLeadListViewState({ search, filters, showFilters, activeTab })
  }, [activeTab, filters, search, showFilters, viewStateHydrated])

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
    const callsByStatus: Record<CallListStatus, CallListEntry[]> = {
      spoken: [],
      not_spoken: [],
      call_back_later: [],
    }

    function recordCall(
      status: string | null | undefined,
      exec: { id: string; full_name: string } | null,
      lead: MetaLead,
      occurrenceId: string,
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
      if (status === "spoken") s.spoken++
      if (status === "not_spoken") s.notSpoken++
      if (status === "call_back_later") s.callBack++
      if (status === "spoken" || status === "not_spoken" || status === "call_back_later") {
        callsByStatus[status].push({ key: `${lead.id}-${occurrenceId}`, lead })
      }
    }

    callStatsLeads.forEach(lead => {
      const followUpCalls = lead.today_follow_up_calls ?? []
      if (followUpCalls.length > 0) {
        followUpCalls.forEach(call => recordCall(
          call.call_status,
          call.completed_by_profile ?? lead.assigned_to_profile,
          lead,
          call.id,
        ))
        return
      }
      if (!calledToday(lead)) return
      recordCall(lead.crm?.call_status, lead.assigned_to_profile, lead, "crm")
    })

    const execList = Array.from(byExec.values())
      .sort((a, b) => (b.spoken + b.notSpoken + b.callBack) - (a.spoken + a.notSpoken + a.callBack))

    return {
      execList,
      callsByStatus,
      totalSpoken: callsByStatus.spoken.length,
      totalNotSpoken: callsByStatus.not_spoken.length,
      totalCallBack: callsByStatus.call_back_later.length,
      totalCalls: callsByStatus.spoken.length + callsByStatus.not_spoken.length + callsByStatus.call_back_later.length,
    }
  }, [callStatsLeads, today])

  const freshlyAssigned = useMemo(
    () => filtered
      .filter(isFreshlyAssignedLead)
      .sort((a, b) => new Date(b.assigned_at ?? 0).getTime() - new Date(a.assigned_at ?? 0).getTime()),
    [filtered],
  )
  const workedLeads = useMemo(
    () => filtered.filter(lead => !isFreshlyAssignedLead(lead)),
    [filtered],
  )

  // This is the exact order rendered on the page and used by the lead-detail
  // Previous/Next buttons when a sales executive opens a lead from here.
  // Fresh assignments are intentionally kept in their own queue.
  const { dueToday, overdue, rest } = useMemo(
    () => getLeadDisplaySections(workedLeads, now),
    [now, workedLeads],
  )

  const visibleLeads = useMemo(() => {
    if (activeTab === "follow-ups") return dueToday
    if (activeTab === "overdue") return overdue
    if (activeTab === "freshly-assigned") return freshlyAssigned
    return rest
  }, [activeTab, dueToday, freshlyAssigned, overdue, rest])

  const selectedCallEntries = callListStatus ? todayCallStats.callsByStatus[callListStatus] : []

  useEffect(() => {
    if (!viewStateHydrated) return
    writeLeadQueueSnapshot(visibleLeads.map(lead => lead.id))
  }, [viewStateHydrated, visibleLeads])

  const captureVisibleQueue = useCallback(() => {
    writeLeadQueueSnapshot(visibleLeads.map(lead => lead.id))
  }, [visibleLeads])

  return (
    <WorkspacePage>
      <PageHeader
        eyebrow="Lead operations"
        title="Leads"
        description={`${filtered.length} of ${leads.length} lead${leads.length !== 1 ? "s" : ""}. Find the next conversation, follow-up, or assignment without losing your place.`}
        actions={
          <>
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />Add lead
            </Button>
            {isSuperAdmin && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={filtered.length === 0}>
                <Download className="h-4 w-4" />Export
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetch()} disabled={displayRefreshing}>
              {displayRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {displayRefreshing ? "Refreshing" : "Refresh"}
            </Button>
          </>
        }
      />

      <MetricGroup className="sm:grid-cols-3 lg:grid-cols-3" aria-label="Lead queue summary">
        <MetricItem label="Visible leads" value={loading ? "—" : filtered.length} detail={`${leads.length} total in your accessible queue`} icon={Users} tone="primary" />
        <MetricItem label="Follow-ups today" value={loading ? "—" : dueToday.length} detail="Scheduled for the current day" icon={Calendar} tone="warning" />
        <MetricItem label="Overdue" value={loading ? "—" : overdue.length} detail="Needs review or rescheduling" icon={AlertCircle} tone="destructive" />
      </MetricGroup>

      {/* Today's Call Stats */}
      {!callStatsLoading && (todayCallStats.totalCalls > 0 || isSuperAdmin) && (
        <SectionPanel className="overflow-hidden">
          <SectionHeader title="Today’s call activity" description={isSuperAdmin ? "Team outcomes recorded today." : "Open an outcome to continue working those leads."} />
          {isSuperAdmin ? (
            todayCallStats.execList.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No calls logged today.</p>
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader><TableRow><TableHead>Executive</TableHead><TableHead className="text-right">Spoken</TableHead><TableHead className="text-right">Not spoken</TableHead><TableHead className="text-right">Call back</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {todayCallStats.execList.map(exec => (
                        <TableRow key={exec.id}>
                          <TableCell className="font-medium">{exec.name}</TableCell>
                          <TableCell className="text-right font-semibold text-success">{exec.spoken}</TableCell>
                          <TableCell className="text-right font-semibold text-destructive">{exec.notSpoken}</TableCell>
                          <TableCell className="text-right font-semibold text-warning">{exec.callBack}</TableCell>
                          <TableCell className="text-right font-semibold">{exec.spoken + exec.notSpoken + exec.callBack}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y divide-border sm:hidden">
                  {todayCallStats.execList.map(exec => (
                    <div key={exec.id} className="p-4">
                      <p className="truncate text-sm font-semibold">{exec.name}</p>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div><p className="tabular-nums text-base font-semibold text-success">{exec.spoken}</p><p className="text-[10px] text-muted-foreground">Spoken</p></div>
                        <div><p className="tabular-nums text-base font-semibold text-destructive">{exec.notSpoken}</p><p className="text-[10px] text-muted-foreground">Missed</p></div>
                        <div><p className="tabular-nums text-base font-semibold text-warning">{exec.callBack}</p><p className="text-[10px] text-muted-foreground">Call back</p></div>
                        <div><p className="tabular-nums text-base font-semibold">{exec.spoken + exec.notSpoken + exec.callBack}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {([
                { status: "spoken", label: "Spoken", value: todayCallStats.totalSpoken, color: "text-success" },
                { status: "not_spoken", label: "Not spoken", value: todayCallStats.totalNotSpoken, color: "text-destructive" },
                { status: "call_back_later", label: "Call back", value: todayCallStats.totalCallBack, color: "text-warning" },
              ] as const).map(item => (
                <button key={item.status} type="button" className="min-h-24 border-b border-r border-border p-4 text-left transition-colors hover:bg-muted/60 focus-visible:z-10" onClick={() => setCallListStatus(item.status)}>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className={`mt-2 tabular-nums text-2xl font-semibold ${item.color}`}>{item.value}</p>
                </button>
              ))}
              <div className="min-h-24 border-b border-border p-4 lg:border-b-0">
                <p className="text-xs font-medium text-muted-foreground">Called today</p>
                <p className="mt-2 tabular-nums text-2xl font-semibold">{todayCallStats.totalCalls}</p>
              </div>
            </div>
          )}
        </SectionPanel>
      )}

      <CallListDialog
        status={callListStatus}
        entries={selectedCallEntries}
        onClose={() => setCallListStatus(null)}
      />

      {/* Search + filter toggle */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-xs sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
          <Input aria-label="Search leads" placeholder="Search name, phone, email, or campaign" value={search} onChange={e => setSearch(e.target.value)} className="border-transparent bg-transparent pl-9 shadow-none focus-visible:bg-background" />
        </div>
        <Button aria-expanded={showFilters} aria-controls="lead-filters" variant="outline" size="sm" className="w-full gap-2 sm:w-auto sm:shrink-0" onClick={() => setShowFilters(p => !p)}>
          <Filter className="w-4 h-4" /> Filters
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 rounded-full"
              style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}>
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <span className="rounded-md bg-surface-selected px-2 py-1 font-medium text-primary">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span>
          <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setShowFilters(true)}>Review filters</button>
          <button type="button" className="ml-auto font-medium text-destructive underline-offset-4 hover:underline" onClick={() => setFilters({ ...EMPTY_LEAD_FILTERS })}>Clear all</button>
        </div>
      )}

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div id="lead-filters" className="grid grid-cols-1 gap-2 rounded-xl p-3 sm:flex sm:flex-wrap sm:items-center"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <FilterSelect value={filters.clientStatus} onChange={v => setFilter("clientStatus", v)}>
                <option value="">All Client Status</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="anti_broker">Anti-Broker</option>
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

      {/* Lead category tabs + list */}
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as LeadTab)} className="gap-4">
        <TabsList aria-label="Lead categories" className="sm:w-full lg:w-fit">
          <TabsTrigger value="leads">
            Leads
            <TabCount value={rest.length} />
          </TabsTrigger>
          <TabsTrigger value="freshly-assigned">
            Freshly Assigned
            <TabCount value={freshlyAssigned.length} />
          </TabsTrigger>
          <TabsTrigger value="follow-ups">
            Follow-ups
            <TabCount value={dueToday.length} tone="warning" />
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue Follow-ups
            <TabCount value={overdue.length} tone="destructive" />
          </TabsTrigger>
        </TabsList>

        {(["leads", "freshly-assigned", "follow-ups", "overdue"] as LeadTab[]).map(tab => {
          const tabLeads = tab === "follow-ups" ? dueToday : tab === "overdue" ? overdue : tab === "freshly-assigned" ? freshlyAssigned : rest
          return (
            <TabsContent key={tab} value={tab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
                </div>
              ) : tabLeads.length === 0 ? (
                <EmptyLeadTab
                  tab={tab}
                  hasQuery={Boolean(search || activeFilterCount > 0)}
                  hasAnyLeads={leads.length > 0}
                  onAdd={() => setAddOpen(true)}
                />
              ) : (
                <Section leads={tabLeads} onOpenLead={captureVisibleQueue} />
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      <AddLeadDialog<MetaLead>
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleLeadAdded}
      />
    </WorkspacePage>
  )
}

function TabCount({ value, tone = "default" }: {
  value: number
  tone?: "default" | "warning" | "destructive"
}) {
  const colors = {
    default: { background: "var(--color-primary)", color: "var(--color-primary-foreground)" },
    warning: { background: "var(--color-warning)", color: "var(--color-primary-foreground)" },
    destructive: { background: "var(--color-destructive)", color: "white" },
  }

  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
      style={colors[tone]}
    >
      {value}
    </span>
  )
}

function EmptyLeadTab({ tab, hasQuery, hasAnyLeads, onAdd }: {
  tab: LeadTab
  hasQuery: boolean
  hasAnyLeads: boolean
  onAdd: () => void
}) {
  const message = hasQuery
    ? `No ${tab === "leads" ? "leads" : tab} match your search or filters`
    : tab === "freshly-assigned"
      ? "No freshly assigned or transferred leads"
      : tab === "follow-ups"
      ? "No follow-ups due today"
      : tab === "overdue"
        ? "No overdue follow-ups"
        : hasAnyLeads
          ? "No other leads to show"
          : "No leads assigned yet"

  return (
    <div className="space-y-3 py-20 text-center">
      <Users className="mx-auto h-10 w-10 opacity-20" />
      <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>{message}</p>
      {tab === "leads" && !hasQuery && !hasAnyLeads && (
        <Button size="sm" variant="outline" className="mx-auto gap-2" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add your first lead manually
        </Button>
      )}
    </div>
  )
}

function CallListDialog({ status, entries, onClose }: {
  status: CallListStatus | null
  entries: CallListEntry[]
  onClose: () => void
}) {
  const labels: Record<CallListStatus, string> = {
    spoken: "Spoken",
    not_spoken: "Not Spoken",
    call_back_later: "Call Back Later",
  }

  const openLead = () => {
    writeLeadQueueSnapshot(Array.from(new Set(entries.map(entry => entry.lead.id))))
    onClose()
  }

  return (
    <Dialog open={status !== null} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{status ? `${labels[status]} calls today` : "Calls today"}</DialogTitle>
          <DialogDescription>
            {entries.length} logged call{entries.length === 1 ? "" : "s"}. Open a lead to continue working it.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leads in this list yet.</p>
          ) : entries.map(entry => (
            <Card key={entry.key}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.lead.full_name ?? "Unknown lead"}</p>
                  <ProtectedPhone value={entry.lead.phone} className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {entry.lead.phone ? formatPhone(entry.lead.phone) : "No contact number"}
                  </ProtectedPhone>
                  {!entry.lead.phone && <p className="mt-0.5 text-xs text-muted-foreground">No contact number</p>}
                </div>
                <Button asChild size="sm">
                  <Link href={`/leads/${entry.lead.id}`} onClick={openLead}>Open Lead</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ leads, onOpenLead }: { leads: MetaLead[]; onOpenLead: () => void }) {
  return (
    <>
      <SectionPanel className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[210px]">Lead</TableHead>
              <TableHead className="min-w-[170px]">Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[140px]">Assigned to</TableHead>
              <TableHead className="min-w-[150px]">Next follow-up</TableHead>
              <TableHead className="w-10"><span className="sr-only">Open lead</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map(lead => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials(lead.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link href={`/leads/${lead.id}`} onClick={onOpenLead} className="flex items-center gap-1.5 truncate font-semibold text-foreground hover:text-primary hover:underline">
                        {isFresh(lead) && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-primary" />}
                        <span className="truncate">{lead.full_name ?? "Unknown"}</span>
                      </Link>
                      <p className="mt-0.5 max-w-[210px] truncate text-xs text-muted-foreground">{lead.campaign_name ?? timeAgo(lead.received_at)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.phone ? <ProtectedPhone value={lead.phone} className="block text-xs font-medium text-foreground">{formatPhone(lead.phone)}</ProtectedPhone> : <span className="text-xs text-muted-foreground">No phone</span>}
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{lead.city ?? "No location"}</p>
                </TableCell>
                <TableCell><div className="flex flex-col items-start gap-1"><ClientStatusBadge status={lead.client_status} antiBroker={lead.client_anti_broker} /><CallStatusBadge status={lead.crm?.call_status} /></div></TableCell>
                <TableCell>
                  {lead.assigned_to_profile ? <span className="block max-w-[140px] truncate text-xs font-medium">{lead.assigned_to_profile.full_name}</span> : <span className="text-xs text-muted-foreground">Unassigned</span>}
                </TableCell>
                <TableCell>
                  {lead.crm?.follow_up_date ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium"><Calendar className="h-3.5 w-3.5 text-warning" />{new Date(lead.crm.follow_up_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  ) : <span className="text-xs text-muted-foreground">Not scheduled</span>}
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="icon-sm"><Link href={`/leads/${lead.id}`} onClick={onOpenLead} aria-label={`Open ${lead.full_name ?? "lead"}`}><ChevronRight className="h-4 w-4" /></Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionPanel>

      <div className="space-y-2 md:hidden">
        <AnimatePresence initial={false}>
          {leads.map((lead, index) => (
            <motion.article key={lead.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 6) * 0.025 }} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0 rounded-lg"><AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials(lead.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <Link href={`/leads/${lead.id}`} onClick={onOpenLead} className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                    {isFresh(lead) && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-primary" />}
                    <span className="truncate">{lead.full_name ?? "Unknown"}</span>
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {lead.phone && <ProtectedPhone value={lead.phone} className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.phone)}</ProtectedPhone>}
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.city ?? "No location"}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5"><ClientStatusBadge status={lead.client_status} antiBroker={lead.client_anti_broker} /><CallStatusBadge status={lead.crm?.call_status} /></div>
              <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3">
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p className="truncate">{lead.assigned_to_profile?.full_name ?? "Unassigned"}</p>
                  {lead.crm?.follow_up_date && <p className="mt-0.5 inline-flex items-center gap-1 text-warning"><Calendar className="h-3 w-3" />{new Date(lead.crm.follow_up_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                </div>
                <Button asChild size="sm" variant="outline"><Link href={`/leads/${lead.id}`} onClick={onOpenLead}>Open<ChevronRight className="h-3.5 w-3.5" /></Link></Button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
