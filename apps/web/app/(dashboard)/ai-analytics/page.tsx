"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  IndianRupee,
  Loader2,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAuthUser } from "@/lib/auth/cookies"
import { cn } from "@/lib/utils"

type Severity = "info" | "positive" | "warning" | "critical"
type GroupBy = "source" | "campaign" | "employee" | "status" | "city" | "budget" | "property" | "propertyType"
type MetricFamily = "all" | "leads" | "employees" | "business" | "activity" | "voice"

interface DimensionRow {
  name: string
  value: number
}

interface InsightCard {
  type: "summary" | "anomaly" | "risk" | "opportunity" | "action"
  title: string
  detail: string
  severity: Severity
  confidence: number
  reason: string
}

interface Delta {
  current: number
  previous: number
  absolute: number
  percentage: number
}

interface AnalyticsOverview {
  generatedAt: string
  freshness: {
    currentPeriod: string
    historicalSnapshots: string
  }
  range: { from: string; to: string }
  compareRange: { from: string; to: string }
  metrics: {
    leads: Record<string, number>
    activity: Record<string, number>
    business: Record<string, number>
    employees: {
      activeSalesExecutives: number
      touchedEmployees: number
      topEmployees: DimensionRow[]
    }
    voice: Record<string, number | boolean>
  }
  dimensions: {
    sources: DimensionRow[]
    campaigns: DimensionRow[]
    cities: DimensionRow[]
    budgets: DimensionRow[]
    statuses: DimensionRow[]
    properties: DimensionRow[]
    propertyTypes: DimensionRow[]
    voiceLabels: DimensionRow[]
  }
  filterOptions: {
    employees: Array<{ id: string; name: string }>
    properties: Array<{ id: string; name: string }>
  }
  deltas: Record<string, Delta>
  insights: InsightCard[]
}

interface DrilldownResponse {
  groupBy: GroupBy
  rows: DimensionRow[]
  note: string
}

interface MetricCardProps {
  label: string
  value: string
  detail: string
  icon: React.ElementType
  tone: "primary" | "success" | "warning" | "danger" | "neutral"
  delta?: Delta
}

const RANGE_PRESETS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "This year", value: "year" },
]

const GROUP_OPTIONS: { label: string; value: GroupBy }[] = [
  { label: "Source", value: "source" },
  { label: "Campaign", value: "campaign" },
  { label: "Employee", value: "employee" },
  { label: "Status", value: "status" },
  { label: "City", value: "city" },
  { label: "Budget", value: "budget" },
  { label: "Property", value: "property" },
  { label: "Property Type", value: "propertyType" },
]

const FAMILY_OPTIONS: { label: string; value: MetricFamily }[] = [
  { label: "All", value: "all" },
  { label: "Leads", value: "leads" },
  { label: "Employees", value: "employees" },
  { label: "Business", value: "business" },
  { label: "Activity", value: "activity" },
  { label: "AI Voice", value: "voice" },
]

const toneStyles: Record<MetricCardProps["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
}

const severityStyles: Record<Severity, string> = {
  info: "border-primary/20 bg-primary/5 text-primary",
  positive: "border-success/20 bg-success/5 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  critical: "border-destructive/25 bg-destructive/10 text-destructive",
}

const chartColors = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "#64748b",
  "#0f766e",
  "#7c3aed",
  "#be123c",
]

function rangeDates(preset: string) {
  const now = new Date()
  if (preset === "year") {
    return {
      from: new Date(now.getFullYear(), 0, 1).toISOString(),
      to: now.toISOString(),
    }
  }

  const days = Number(preset)
  return {
    from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
    to: now.toISOString(),
  }
}

function formatNumber(value: number | undefined) {
  return Math.round(value ?? 0).toLocaleString("en-IN")
}

function formatMoney(value: number | undefined) {
  const amount = value ?? 0
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(1)} Cr`
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(1)} L`
  return `Rs ${Math.round(amount).toLocaleString("en-IN")}`
}

function formatDelta(delta?: Delta) {
  if (!delta) return "No comparison"
  const prefix = delta.percentage > 0 ? "+" : ""
  return `${prefix}${delta.percentage}% vs previous`
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function MetricCard({ label, value, detail, icon: Icon, tone, delta }: MetricCardProps) {
  const deltaTone = !delta || delta.absolute === 0
    ? "text-muted-foreground"
    : delta.absolute > 0
      ? "text-success"
      : "text-destructive"
  const DeltaIcon = !delta || delta.absolute >= 0 ? TrendingUp : TrendingDown

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">{detail}</span>
          {delta && (
            <span className={cn("inline-flex items-center gap-1 font-medium", deltaTone)}>
              <DeltaIcon className="h-3 w-3" />
              {formatDelta(delta)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export default function AiAnalyticsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = React.useState<boolean | null>(null)
  const [rangePreset, setRangePreset] = React.useState("30")
  const [groupBy, setGroupBy] = React.useState<GroupBy>("source")
  const [metricFamily, setMetricFamily] = React.useState<MetricFamily>("all")
  const [source, setSource] = React.useState("all")
  const [campaignName, setCampaignName] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [employeeId, setEmployeeId] = React.useState("all")
  const [propertyId, setPropertyId] = React.useState("all")
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(null)
  const [drilldown, setDrilldown] = React.useState<DrilldownResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const user = getAuthUser()
    if (!user) {
      router.replace("/login")
      return
    }
    setAuthorized(user.role === "super_admin")
  }, [router])

  const query = React.useMemo(() => {
    const dates = rangeDates(rangePreset)
    const params = new URLSearchParams({
      from: dates.from,
      to: dates.to,
      compareTo: "previous",
      groupBy,
      metricFamily,
    })
    if (source !== "all") params.set("source", source)
    if (campaignName !== "all") params.set("campaignName", campaignName)
    if (status !== "all") params.set("status", status)
    if (employeeId !== "all") params.set("employeeId", employeeId)
    if (propertyId !== "all") params.set("propertyId", propertyId)
    return params.toString()
  }, [campaignName, employeeId, groupBy, metricFamily, propertyId, rangePreset, source, status])

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, drilldownRes] = await Promise.all([
        fetch(`/api/dashboard/ai-analytics/overview?${query}`, { cache: "no-store" }),
        fetch(`/api/dashboard/ai-analytics/drilldown?${query}`, { cache: "no-store" }),
      ])
      const overviewJson = await overviewRes.json().catch(() => ({}))
      const drilldownJson = await drilldownRes.json().catch(() => ({}))
      if (!overviewRes.ok) throw new Error(overviewJson.message ?? overviewJson.error ?? "Failed to load AI Analytics")
      if (!drilldownRes.ok) throw new Error(drilldownJson.message ?? drilldownJson.error ?? "Failed to load drilldown")
      setOverview(overviewJson)
      setDrilldown(drilldownJson)
    } catch (err) {
      setOverview(null)
      setDrilldown(null)
      setError(err instanceof Error ? err.message : "Failed to load AI Analytics")
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    if (authorized === true) void fetchAnalytics()
  }, [authorized, fetchAnalytics])

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (authorized === false) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">Access restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">AI Analytics is available only for super admins.</p>
      </div>
    )
  }

  const metrics = overview?.metrics
  const sources = overview?.dimensions.sources ?? []
  const campaigns = overview?.dimensions.campaigns ?? []
  const statuses = overview?.dimensions.statuses ?? []
  const employeeOptions = overview?.filterOptions.employees ?? []
  const propertyOptions = overview?.filterOptions.properties ?? []
  const drillRows = drilldown?.rows ?? []
  const pieRows = sources.length > 0 ? sources.slice(0, 6) : [{ name: "No data", value: 1 }]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Super Admin
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Database className="h-3.5 w-3.5" />
              {overview?.freshness.currentPeriod ?? "live"}
            </Badge>
            {overview?.generatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {new Date(overview.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">AI Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {overview ? `${dateLabel(overview.range.from)} to ${dateLabel(overview.range.to)}` : "Loading analytics window"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:w-auto">
          <SearchableSelect
            value={rangePreset}
            onValueChange={setRangePreset}
            options={RANGE_PRESETS.map(option => ({ value: option.value, label: option.label }))}
            searchPlaceholder="Search range..."
            triggerClassName="w-full sm:w-[150px]"
          />
          <Button onClick={() => void fetchAnalytics()} disabled={loading} className="gap-2 gold-gradient font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="shadow-card">
        <CardContent className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-8">
          <SearchableSelect
            value={metricFamily}
            onValueChange={(value) => setMetricFamily(value as MetricFamily)}
            options={FAMILY_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
            searchPlaceholder="Search metric..."
          />
          <SearchableSelect
            value={groupBy}
            onValueChange={(value) => setGroupBy(value as GroupBy)}
            options={GROUP_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
            searchPlaceholder="Search group..."
          />
          <SearchableSelect
            value={source}
            onValueChange={setSource}
            options={[
              { value: "all", label: "All sources" },
              ...sources.map(row => ({ value: row.name, label: row.name })),
            ]}
            placeholder="Source"
            searchPlaceholder="Search source..."
          />
          <SearchableSelect
            value={campaignName}
            onValueChange={setCampaignName}
            options={[
              { value: "all", label: "All campaigns" },
              ...campaigns.map(row => ({ value: row.name, label: row.name })),
            ]}
            placeholder="Campaign"
            searchPlaceholder="Search campaign..."
          />
          <SearchableSelect
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              ...statuses.map(row => ({ value: row.name, label: row.name })),
            ]}
            placeholder="Status"
            searchPlaceholder="Search status..."
          />
          <SearchableSelect
            value={employeeId}
            onValueChange={setEmployeeId}
            options={[
              { value: "all", label: "All employees" },
              ...employeeOptions.map(row => ({ value: row.id, label: row.name })),
            ]}
            placeholder="Employee"
            searchPlaceholder="Search employee..."
          />
          <SearchableSelect
            value={propertyId}
            onValueChange={setPropertyId}
            options={[
              { value: "all", label: "All properties" },
              ...propertyOptions.map(row => ({ value: row.id, label: row.name })),
            ]}
            placeholder="Property"
            searchPlaceholder="Search property..."
          />
          <Button variant="outline" onClick={() => { setSource("all"); setCampaignName("all"); setStatus("all"); setEmployeeId("all"); setPropertyId("all"); setMetricFamily("all") }}>
            Clear
          </Button>
        </CardContent>
      </Card>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : overview && metrics ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Leads Received" value={formatNumber(metrics.leads.received)} detail={`${formatNumber(metrics.leads.fresh)} fresh`} icon={Users} tone="primary" delta={overview.deltas.leads} />
            <MetricCard label="Calls Logged" value={formatNumber(metrics.activity.callsLogged)} detail={`${formatNumber(metrics.activity.spokenCalls)} spoken`} icon={Phone} tone="success" delta={overview.deltas.calls} />
            <MetricCard label="Confirmed Revenue" value={formatMoney(metrics.business.confirmedRevenue)} detail={`${formatNumber(metrics.business.confirmedBookings)} bookings`} icon={IndianRupee} tone="warning" delta={overview.deltas.confirmedRevenue} />
            <MetricCard label="AI Voice Calls" value={formatNumber(metrics.voice.calls as number)} detail={`${formatNumber(metrics.voice.hotAlerts as number)} hot alerts`} icon={Brain} tone="neutral" delta={overview.deltas.voiceCalls} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="shadow-card lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Executive Insights
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Rule-detected signals from aggregate metrics</p>
                </div>
                <Badge variant="outline">Aggregate only</Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {overview.insights.map((insight) => (
                  <div key={`${insight.type}-${insight.title}`} className={cn("rounded-lg border p-3", severityStyles[insight.severity])}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <span className="text-[11px] font-medium">{Math.round(insight.confidence * 100)}%</span>
                    </div>
                    <p className="text-sm text-foreground">{insight.detail}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{insight.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Source Mix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieRows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                        {pieRows.map((_, index) => (
                          <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pipeline" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-5">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="voice">AI Voice</TabsTrigger>
              <TabsTrigger value="drilldown">Drilldown</TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Lead Converted" value={formatNumber(metrics.leads.leadStageConverted)} detail={`${formatNumber(metrics.leads.rejected)} rejected`} icon={Target} tone="success" delta={overview.deltas.leadStageConversions} />
                <MetricCard label="Hot Leads" value={formatNumber(metrics.leads.hot)} detail={`${formatNumber(metrics.leads.warm)} warm, ${formatNumber(metrics.leads.cold)} cold`} icon={Flame} tone="warning" />
                <MetricCard label="Follow-ups Due" value={formatNumber(metrics.activity.followUpsDue)} detail={`${formatNumber(metrics.activity.overdueFollowUps)} overdue`} icon={Clock} tone={metrics.activity.overdueFollowUps > 0 ? "danger" : "neutral"} />
                <MetricCard label="Spoken Rate" value={`${formatNumber(metrics.leads.spokenRate)}%`} detail={`${formatNumber(metrics.activity.callbackCalls)} callbacks`} icon={Activity} tone="primary" delta={overview.deltas.spokenRate} />
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4 text-primary" />
                      Employee Lead Touch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {(metrics.employees.topEmployees ?? []).length === 0 ? (
                        <EmptyBlock message="Employee aggregates will appear once assigned activity is available." />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.employees.topEmployees} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                            <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-4">
                  <MetricCard label="Sales Executives" value={formatNumber(metrics.employees.activeSalesExecutives)} detail={`${formatNumber(metrics.employees.touchedEmployees)} with activity`} icon={ShieldCheck} tone="neutral" />
                  <MetricCard label="Assignments" value={formatNumber(metrics.activity.assignments)} detail={`${formatNumber(metrics.activity.transfers)} transfers`} icon={Zap} tone="primary" />
                  <MetricCard label="CRM Updates" value={formatNumber(metrics.activity.crmUpdates)} detail="Activity timeline events" icon={Activity} tone="success" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="business" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Booking Conversion" value={`${formatNumber(metrics.business.bookingConversion)}%`} detail="Confirmed bookings / leads" icon={CheckCircle2} tone="success" />
                <MetricCard label="Average Booking" value={formatMoney(metrics.business.averageBookingValue)} detail={`${formatMoney(metrics.business.pendingRevenue)} pending`} icon={IndianRupee} tone="warning" />
                <MetricCard label="Properties Available" value={formatNumber(metrics.business.availableProperties)} detail={`${formatNumber(metrics.business.reservedProperties)} reserved`} icon={Building2} tone="primary" />
                <MetricCard label="Site Visits" value={formatNumber(metrics.activity.siteVisitsScheduled)} detail={`${formatNumber(metrics.activity.siteVisitsCompleted)} completed`} icon={CalendarDays} tone="neutral" delta={overview.deltas.siteVisits} />
              </div>
            </TabsContent>

            <TabsContent value="voice" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Answered Calls" value={formatNumber(metrics.voice.answeredCalls as number)} detail={`${formatNumber(metrics.voice.unreviewedCalls as number)} unreviewed`} icon={Phone} tone="success" />
                <MetricCard label="Average Score" value={formatNumber(metrics.voice.avgScore as number)} detail={`${formatNumber(metrics.voice.dncRequests as number)} DNC requests`} icon={Brain} tone="primary" />
                <MetricCard label="Escalations" value={formatNumber(metrics.voice.escalations as number)} detail={`${formatNumber(metrics.voice.guardrailBlocks as number)} guardrail blocks`} icon={AlertCircle} tone={(metrics.voice.escalations as number) > 0 ? "danger" : "neutral"} />
                <MetricCard label="LLM Latency" value={`${formatNumber(metrics.voice.avgLlmMs as number)}ms`} detail={`${formatNumber(metrics.voice.promptTokens as number)} prompt tokens`} icon={Zap} tone="warning" />
              </div>
            </TabsContent>

            <TabsContent value="drilldown">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      {GROUP_OPTIONS.find(option => option.value === groupBy)?.label ?? "Group"} Breakdown
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{drilldown?.note}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[360px]">
                    {drillRows.length === 0 ? (
                      <EmptyBlock message="No grouped rows are available for the selected filters." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={drillRows} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                          <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </motion.div>
  )
}
