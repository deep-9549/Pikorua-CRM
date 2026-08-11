"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Flame,
  Loader2,
  Phone,
  RefreshCw,
  Target,
  Thermometer,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricGroup, MetricItem, PageHeader, SectionHeader, SectionPanel, WorkspacePage } from "@/components/ui/workspace"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { useMetaLeads } from "@/hooks/use-meta-leads"
import { cn, formatPhone } from "@/lib/utils"
import { dateKey, isFreshLead } from "@/lib/lead-display-order"
import { calculateComparableLeadGrowth, comparableLeadGrowthLabel } from "@/lib/dashboard-lead-growth"

interface CrmDetails {
  call_status?: "spoken" | "not_spoken" | "call_back_later" | string | null
  first_call_date?: string | null
  last_call_date?: string | null
  follow_up_date?: string | null
  hwc?: "hot" | "warm" | "cold" | string | null
  buying_status?: string | null
  site_visit_status?: string | null
  budget_range?: string | null
}

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string | null
  status: string
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string } | null
  crm?: CrmDetails | null
  client_status?: string | null
}

interface VisitRow {
  id: string
  visit_date: string | null
  visit_confirmation_date: string | null
  site_visit_status: string
  status: string
  lead?: {
    id: string
    full_name: string | null
    phone: string | null
    city: string | null
    assigned_to_profile: { id: string; full_name: string } | null
  } | null
  scheduled_by_profile?: { id: string; full_name: string } | null
}

const EMPTY_LEADS: MetaLead[] = []
const EMPTY_VISITS: VisitRow[] = []

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(part => part[0]).join("").toUpperCase().slice(0, 2)
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN")
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function buildMonthBuckets(now: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      key: monthKey(date),
      month: date.toLocaleDateString("en-IN", { month: "short" }),
      leads: 0,
      spoken: 0,
      notSpoken: 0,
      callbacks: 0,
    }
  })
}

function callWasToday(lead: MetaLead, today: string) {
  return [lead.crm?.first_call_date, lead.crm?.last_call_date].some(value => dateKey(value) === today)
}

function latestCallDate(lead: MetaLead) {
  const dates = [lead.crm?.first_call_date, lead.crm?.last_call_date]
    .map(parseDate)
    .filter((date): date is Date => date !== null)

  return dates.length > 0
    ? new Date(Math.max(...dates.map(date => date.getTime())))
    : null
}

function displayStatus(lead: MetaLead) {
  if (lead.client_status) return lead.client_status.replaceAll("_", " ")
  if (lead.crm?.call_status) return lead.crm.call_status.replaceAll("_", " ")
  return isFreshLead(lead) ? "fresh" : "active"
}

function EmptyBlock({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <Icon className="h-7 w-7 opacity-35" />
      {label}
    </div>
  )
}

export default function DashboardPage() {
  const {
    data,
    isLoading: leadsLoading,
    isFetching: leadsFetching,
    error: leadsError,
    refetch,
  } = useMetaLeads<MetaLead>()
  const leads = data ?? EMPTY_LEADS
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [visits, setVisits] = React.useState<VisitRow[]>(EMPTY_VISITS)
  const [visitsLoading, setVisitsLoading] = React.useState(true)
  const [visitsError, setVisitsError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const fetchVisits = React.useCallback(async () => {
    setVisitsLoading(true)
    setVisitsError(null)
    try {
      const res = await fetch("/api/site-visits", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to load site visits")
      setVisits(json.visits ?? [])
    } catch (error) {
      setVisits([])
      setVisitsError(error instanceof Error ? error.message : "Failed to load site visits")
    } finally {
      setVisitsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchVisits()
  }, [fetchVisits])

  const now = React.useMemo(() => new Date(nowMs), [nowMs])

  const dashboard = React.useMemo(() => {
    const today = dateKey(now)
    const buckets = buildMonthBuckets(now)
    const byMonth = new Map(buckets.map(bucket => [bucket.key, bucket]))
    const team = new Map<string, {
      id: string
      name: string
      assigned: number
      calledToday: number
      spoken: number
      followUps: number
    }>()

    let fresh = 0
    let followUpToday = 0
    let overdue = 0
    let calledToday = 0
    let spoken = 0
    let callback = 0
    let hot = 0
    let warm = 0

    leads.forEach((lead) => {
      if (isFreshLead(lead)) fresh += 1

      const followUp = dateKey(lead.crm?.follow_up_date)
      if (followUp === today) followUpToday += 1
      if (followUp && followUp < today) overdue += 1

      const callToday = callWasToday(lead, today)
      if (callToday) calledToday += 1
      if (lead.crm?.call_status === "spoken") spoken += 1
      if (lead.crm?.call_status === "call_back_later") callback += 1

      const heat = lead.client_status ?? lead.crm?.hwc
      if (heat === "hot") hot += 1
      if (heat === "warm") warm += 1

      const received = parseDate(lead.received_at)
      if (received) {
        const key = monthKey(received)
        const bucket = byMonth.get(key)
        if (bucket) {
          bucket.leads += 1
        }
      }

      // A call outcome belongs to the month the call was made, not the month
      // the lead entered the CRM. The CRM list exposes the latest outcome per
      // lead, so each lead contributes once at its most recent recorded call.
      const callDate = latestCallDate(lead)
      const callBucket = callDate ? byMonth.get(monthKey(callDate)) : undefined
      if (callBucket) {
        if (lead.crm?.call_status === "spoken") callBucket.spoken += 1
        if (lead.crm?.call_status === "not_spoken") callBucket.notSpoken += 1
        if (lead.crm?.call_status === "call_back_later") callBucket.callbacks += 1
      }

      const owner = lead.assigned_to_profile
      const ownerId = owner?.id ?? "unassigned"
      if (!team.has(ownerId)) {
        team.set(ownerId, {
          id: ownerId,
          name: owner?.full_name ?? "Unassigned",
          assigned: 0,
          calledToday: 0,
          spoken: 0,
          followUps: 0,
        })
      }
      const member = team.get(ownerId)!
      member.assigned += 1
      if (callToday) member.calledToday += 1
      if (lead.crm?.call_status === "spoken") member.spoken += 1
      if (followUp === today) member.followUps += 1
    })

    const teamRows = Array.from(team.values())
      .sort((a, b) => b.calledToday - a.calledToday || b.assigned - a.assigned)
      .slice(0, 5)

    const recent = [...leads]
      .sort((a, b) => (parseDate(b.received_at)?.getTime() ?? 0) - (parseDate(a.received_at)?.getTime() ?? 0))
      .slice(0, 5)

    const conversionRate = leads.length ? (spoken / leads.length) * 100 : 0
    const warmRate = leads.length ? (warm / leads.length) * 100 : 0
    const leadGrowth = calculateComparableLeadGrowth(leads.map(lead => lead.received_at), now)

    return {
      fresh,
      followUpToday,
      overdue,
      calledToday,
      spoken,
      callback,
      hot,
      warm,
      warmRate,
      conversionRate,
      leadGrowth,
      chartData: buckets,
      teamRows,
      recent,
    }
  }, [leads, now])

  const upcomingVisitRows = React.useMemo(() => {
    return visits.filter(visit => {
      const when = parseDate(visit.visit_date ?? visit.visit_confirmation_date)
      return visit.status === "scheduled" && Boolean(when && when.getTime() >= now.getTime())
    })
  }, [visits, now])

  const upcomingVisits = React.useMemo(() => {
    return [...upcomingVisitRows]
      .sort((a, b) => {
        const aDate = parseDate(a.visit_date ?? a.visit_confirmation_date)?.getTime() ?? 0
        const bDate = parseDate(b.visit_date ?? b.visit_confirmation_date)?.getTime() ?? 0
        return aDate - bDate
      })
      .slice(0, 4)
  }, [upcomingVisitRows])

  const loading = leadsLoading || visitsLoading
  const refreshing = leadsFetching || visitsLoading
  const leadError = leadsError instanceof Error ? leadsError.message : leadsError ? "Failed to load leads" : null

  async function refreshDashboard() {
    await Promise.all([refetch(), fetchVisits()])
  }

  return (
    <WorkspacePage>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PageHeader
          eyebrow={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          title="Today’s sales workspace"
          description="Priorities, pipeline health, calls, and visits—using the live CRM record."
          actions={
            <>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/leads"><Users className="h-4 w-4" />Work leads</Link>
              </Button>
              <Button size="sm" onClick={() => void refreshDashboard()} disabled={refreshing} className="gap-2">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            </>
          }
        />
      </motion.div>

      {(leadError || visitsError) && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{leadError ?? visitsError}</span>
        </div>
      )}

      <SectionPanel className="overflow-hidden">
        <SectionHeader title="Needs attention" description="Start here before reviewing the wider pipeline." />
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Overdue follow-ups", value: dashboard.overdue, icon: AlertCircle, tone: "text-destructive bg-destructive/10" },
            { label: "Due today", value: dashboard.followUpToday, icon: Clock, tone: "text-warning bg-warning/10" },
            { label: "Fresh leads", value: dashboard.fresh, icon: Target, tone: "text-primary bg-primary/10" },
            { label: "Upcoming visits", value: upcomingVisitRows.length, icon: Calendar, tone: "text-success bg-success/10" },
          ].map((item, index) => (
            <Link key={item.label} href={item.label === "Upcoming visits" ? "/site-visits" : "/leads"} className={cn("group flex min-w-0 items-center gap-3 border-border p-3.5 transition-colors hover:bg-muted/60 sm:p-4", index % 2 === 0 && "border-r", index < 2 && "border-b lg:border-b-0", index < 3 && "lg:border-r")}>
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.tone)}><item.icon className="h-4 w-4" strokeWidth={1.8} /></span>
              <span className="min-w-0">
                <span className="block tabular-nums text-xl font-semibold tracking-[-0.03em] text-foreground">{loading ? "—" : formatNumber(item.value)}</span>
                <span className="block truncate text-xs text-muted-foreground group-hover:text-foreground">{item.label}</span>
              </span>
              <ArrowUpRight className="ml-auto hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </Link>
          ))}
        </div>
      </SectionPanel>

      <MetricGroup aria-label="Pipeline snapshot">
        <MetricItem label="Total leads" value={loading ? "—" : formatNumber(leads.length)} detail={comparableLeadGrowthLabel(dashboard.leadGrowth)} icon={Users} tone="primary" />
        <MetricItem label="Warm leads" value={loading ? "—" : formatNumber(dashboard.warm)} detail={`${dashboard.warmRate.toFixed(1)}% of total leads`} icon={Thermometer} tone="warning" />
        <MetricItem label="Hot leads" value={loading ? "—" : formatNumber(dashboard.hot)} detail={`${dashboard.conversionRate.toFixed(1)}% spoken rate`} icon={Flame} tone="destructive" />
        <MetricItem label="Site visits" value={visitsLoading ? "—" : formatNumber(visits.length)} detail={`${formatNumber(upcomingVisitRows.length)} scheduled ahead`} icon={Building2} tone="success" />
      </MetricGroup>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">Lead Volume</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Last six months by received date</p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[230px] sm:h-[270px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : dashboard.chartData.every(row => row.leads === 0) ? (
                  <EmptyBlock icon={BarChart3} label="Lead trends will appear once CRM data is available." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboard.chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const row = payload[0].payload
                          return (
                            <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-lg">
                              <p className="font-semibold">{row.month}</p>
                              <p className="text-primary">{row.leads} leads</p>
                            </div>
                          )
                        }}
                      />
                      <Area type="monotone" dataKey="leads" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#leadVolume)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Call Outcomes</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Latest recorded outcome by call date</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[230px] sm:h-[270px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : dashboard.chartData.every(row => row.spoken === 0 && row.notSpoken === 0 && row.callbacks === 0) ? (
                  <EmptyBlock icon={Phone} label="Call outcomes will appear after CRM calls are logged." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }} barCategoryGap="24%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="spoken" name="Spoken" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="notSpoken" name="Not spoken" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="callbacks" name="Call back" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <Card className="flex min-h-[360px] flex-col overflow-hidden shadow-card sm:h-[430px]">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">Recent Leads</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Newest inquiries in the CRM</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
                <Link href="/leads">
                  View <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-2 pt-2 [scrollbar-gutter:stable]">
              {leadsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : dashboard.recent.length === 0 ? (
                <EmptyBlock icon={Users} label="No leads loaded yet." />
              ) : (
                dashboard.recent.map(lead => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs gold-gradient">{initials(lead.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.full_name ?? "Unknown"}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.city ?? lead.campaign_name ?? "No location"}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">
                      {displayStatus(lead)}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <Card className="flex min-h-[360px] flex-col overflow-hidden shadow-card sm:h-[430px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Focus</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Workload and call activity</p>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-2 pt-2 [scrollbar-gutter:stable]">
              {leadsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : dashboard.teamRows.length === 0 ? (
                <EmptyBlock icon={UserCheck} label="Assignments will appear here once leads are assigned." />
              ) : (
                dashboard.teamRows.map(member => (
                  <div key={member.id} className="rounded-lg border border-border px-3 py-2.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(member.assigned)} assigned leads</p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                        <UserCheck className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-md bg-muted/60 px-2 py-1.5">
                        <p className="font-bold">{member.calledToday}</p>
                        <p className="text-muted-foreground">Today</p>
                      </div>
                      <div className="rounded-md bg-muted/60 px-2 py-1.5">
                        <p className="font-bold">{member.spoken}</p>
                        <p className="text-muted-foreground">Spoken</p>
                      </div>
                      <div className="rounded-md bg-muted/60 px-2 py-1.5">
                        <p className="font-bold">{member.followUps}</p>
                        <p className="text-muted-foreground">Due</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <Card className="flex min-h-[360px] flex-col overflow-hidden shadow-card sm:h-[430px]">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">Upcoming Visits</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Next scheduled site visits</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
                <Link href="/site-visits">
                  View <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-2 pt-2 [scrollbar-gutter:stable]">
              {visitsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : upcomingVisits.length === 0 ? (
                <EmptyBlock icon={Calendar} label="No upcoming visits scheduled." />
              ) : (
                upcomingVisits.map(visit => {
                  const when = parseDate(visit.visit_date ?? visit.visit_confirmation_date)
                  const lead = visit.lead
                  return (
                    <div key={visit.id} className="rounded-lg border border-border px-3 py-2.5">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <span className="text-sm font-bold leading-none">{when ? when.getDate() : "-"}</span>
                          <span className="text-[9px] uppercase">{when ? when.toLocaleDateString("en-IN", { month: "short" }) : "TBD"}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lead?.full_name ?? "Unknown lead"}</p>
                          <p className="truncate text-xs text-muted-foreground">{lead?.city ?? "No location"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {when && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {lead?.phone && (
                          <ProtectedPhone value={lead.phone} className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(lead.phone)}
                          </ProtectedPhone>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </WorkspacePage>
  )
}
