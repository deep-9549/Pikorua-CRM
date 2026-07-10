"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  Phone,
  RefreshCw,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { getAuthUser } from "@/lib/auth/cookies"
import { cn, formatPhone } from "@/lib/utils"

type PeriodKey = "daily" | "weekly" | "monthly" | "yearly" | "lifetime"

interface Employee {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
  status: string | null
  created_at: string
}

interface PerformanceSummary {
  totalLeads: number
  activeLeads: number
  convertedLeads: number
  rejectedLeads: number
  coldPoolLeads: number
  callsLogged: number
  spokenCalls: number
  notSpokenCalls: number
  callbackCalls: number
  followUpsDue: number
  siteVisitsScheduled: number
  siteVisitsCompleted: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  conversionRate: number
}

interface TrendRow {
  label?: string
  month?: string
  leads: number
  calls: number
  visits: number
  conversions: number
}

interface RecentLead {
  id: string
  full_name: string | null
  phone: string | null
  city: string | null
  campaign_name: string | null
  status: string
  received_at: string
  assigned_at: string | null
  ownership_status?: "current" | "previous"
  call_status: string | null
  follow_up_date: string | null
  hwc: string | null
  buying_status: string | null
  site_visit_status: string | null
}

interface PerformanceResponse {
  employees: Employee[]
  selectedEmployee: Employee | null
  periods: Partial<Record<PeriodKey, PerformanceSummary>>
  trend: TrendRow[]
  trendByPeriod?: Partial<Record<PeriodKey, TrendRow[]>>
  recentLeads: RecentLead[]
  generatedAt: string
}

interface MetricCardProps {
  label: string
  value: string | number
  detail: string
  icon: React.ElementType
  tone: "primary" | "success" | "warning" | "danger" | "neutral"
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "lifetime", label: "Lifetime" },
]

const TREND_COPY: Record<PeriodKey, { title: string; description: string }> = {
  daily: {
    title: "Daily Performance Trend",
    description: "Hourly assigned leads, calls, visits, and conversions for today",
  },
  weekly: {
    title: "Weekly Performance Trend",
    description: "Day-wise assigned leads, calls, visits, and conversions for this week",
  },
  monthly: {
    title: "Monthly Performance Trend",
    description: "Date-wise assigned leads, calls, visits, and conversions for this month",
  },
  yearly: {
    title: "Yearly Performance Trend",
    description: "Month-wise assigned leads, calls, visits, and conversions for this year",
  },
  lifetime: {
    title: "Lifetime Performance Trend",
    description: "Historical assigned leads, calls, visits, and conversions for this employee",
  },
}

const EMPTY_SUMMARY: PerformanceSummary = {
  totalLeads: 0,
  activeLeads: 0,
  convertedLeads: 0,
  rejectedLeads: 0,
  coldPoolLeads: 0,
  callsLogged: 0,
  spokenCalls: 0,
  notSpokenCalls: 0,
  callbackCalls: 0,
  followUpsDue: 0,
  siteVisitsScheduled: 0,
  siteVisitsCompleted: 0,
  hotLeads: 0,
  warmLeads: 0,
  coldLeads: 0,
  conversionRate: 0,
}

const toneStyles: Record<MetricCardProps["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(part => part[0]).join("").toUpperCase().slice(0, 2)
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function pretty(value: string | null | undefined) {
  if (!value) return "Not updated"
  return value.replaceAll("_", " ")
}

function MetricCard({ label, value, detail, icon: Icon, tone }: MetricCardProps) {
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
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export default function EmployeePerformanceAnalysisPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = React.useState<boolean | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("")
  const [activePeriod, setActivePeriod] = React.useState<PeriodKey>("monthly")
  const [data, setData] = React.useState<PerformanceResponse | null>(null)
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

  const fetchPerformance = React.useCallback(async (employeeId: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""
      const res = await fetch(`/api/dashboard/employee-performance${params}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to load employee performance")
      setData(json)
      if (json.selectedEmployee?.id) setSelectedEmployeeId(json.selectedEmployee.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee performance")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (authorized === true) void fetchPerformance(selectedEmployeeId)
  }, [authorized, fetchPerformance, selectedEmployeeId])

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
        <p className="mt-2 text-sm text-muted-foreground">
          Employee Performance Analysis is available only for super admins.
        </p>
      </div>
    )
  }

  const selectedEmployee = data?.selectedEmployee ?? null
  const summary = data?.periods?.[activePeriod] ?? EMPTY_SUMMARY
  const trendCopy = TREND_COPY[activePeriod]
  const trendRows = (data?.trendByPeriod?.[activePeriod] ?? data?.trend ?? []).map(row => ({
    ...row,
    label: row.label ?? row.month ?? "",
  }))
  const hasEmployees = Boolean(data?.employees?.length)
  const spokenRate = summary.callsLogged > 0
    ? Math.round((summary.spokenCalls / summary.callsLogged) * 1000) / 10
    : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Super Admin
            </Badge>
            {data?.generatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
            Employee Performance Analysis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Employee-wise lead, call, conversion, follow-up, and site-visit performance.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <SearchableSelect
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
            disabled={loading || !hasEmployees}
            options={(data?.employees ?? []).map(employee => ({
              value: employee.id,
              label: employee.full_name ?? employee.email ?? "Unnamed employee",
              searchText: `${employee.full_name ?? ""} ${employee.email ?? ""}`,
            }))}
            placeholder="Select employee"
            searchPlaceholder="Search employee..."
            triggerClassName="w-full sm:w-[280px]"
          />
          <Button
            type="button"
            className="gap-2 gold-gradient font-semibold"
            onClick={() => void fetchPerformance(selectedEmployeeId)}
            disabled={loading}
          >
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

      {!loading && !hasEmployees && (
        <EmptyBlock message="No sales executives are available yet." />
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : selectedEmployee ? (
        <>
          <Card className="shadow-card">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="gold-gradient text-sm font-bold">
                    {initials(selectedEmployee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {selectedEmployee.full_name ?? "Unnamed employee"}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {selectedEmployee.email && <span>{selectedEmployee.email}</span>}
                    {selectedEmployee.phone && (
                      <ProtectedPhone value={selectedEmployee.phone}>
                        {formatPhone(selectedEmployee.phone)}
                      </ProtectedPhone>
                    )}
                    <span className="capitalize">{pretty(selectedEmployee.status)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center sm:w-[360px]">
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-lg font-bold">{formatNumber(data?.periods?.lifetime?.totalLeads ?? 0)}</p>
                  <p className="text-[11px] text-muted-foreground">Leads</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-lg font-bold">{formatNumber(data?.periods?.lifetime?.callsLogged ?? 0)}</p>
                  <p className="text-[11px] text-muted-foreground">Calls</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-lg font-bold">{formatNumber(data?.periods?.lifetime?.siteVisitsCompleted ?? 0)}</p>
                  <p className="text-[11px] text-muted-foreground">Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activePeriod} onValueChange={(value) => setActivePeriod(value as PeriodKey)} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5">
              {PERIODS.map(period => (
                <TabsTrigger key={period.key} value={period.key} className="text-xs sm:text-sm">
                  {period.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {PERIODS.map(period => (
              <TabsContent key={period.key} value={period.key} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Assigned Leads"
                    value={formatNumber(summary.totalLeads)}
                    detail={`${formatNumber(summary.activeLeads)} active right now`}
                    icon={Users}
                    tone="primary"
                  />
                  <MetricCard
                    label="Calls Logged"
                    value={formatNumber(summary.callsLogged)}
                    detail={`${spokenRate}% spoken rate`}
                    icon={Phone}
                    tone="success"
                  />
                  <MetricCard
                    label="Conversions"
                    value={formatNumber(summary.convertedLeads)}
                    detail={`${summary.conversionRate}% conversion rate`}
                    icon={Target}
                    tone="warning"
                  />
                  <MetricCard
                    label="Site Visits"
                    value={formatNumber(summary.siteVisitsScheduled)}
                    detail={`${formatNumber(summary.siteVisitsCompleted)} completed`}
                    icon={CalendarClock}
                    tone="neutral"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Phone className="h-4 w-4 text-success" />
                        Call Outcome
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-success/10 px-3 py-3 text-success">
                        <p className="text-xl font-bold">{summary.spokenCalls}</p>
                        <p className="text-[11px]">Spoken</p>
                      </div>
                      <div className="rounded-lg bg-destructive/10 px-3 py-3 text-destructive">
                        <p className="text-xl font-bold">{summary.notSpokenCalls}</p>
                        <p className="text-[11px]">Not spoken</p>
                      </div>
                      <div className="rounded-lg bg-primary/10 px-3 py-3 text-primary">
                        <p className="text-xl font-bold">{summary.callbackCalls}</p>
                        <p className="text-[11px]">Callback</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Flame className="h-4 w-4 text-warning" />
                        Lead Quality
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-warning/10 px-3 py-3 text-warning">
                        <p className="text-xl font-bold">{summary.hotLeads}</p>
                        <p className="text-[11px]">Hot</p>
                      </div>
                      <div className="rounded-lg bg-primary/10 px-3 py-3 text-primary">
                        <p className="text-xl font-bold">{summary.warmLeads}</p>
                        <p className="text-[11px]">Warm</p>
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-3 text-muted-foreground">
                        <p className="text-xl font-bold">{summary.coldLeads}</p>
                        <p className="text-[11px]">Cold</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-primary" />
                        Follow-up Load
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-primary/10 px-3 py-3 text-primary">
                        <p className="text-xl font-bold">{summary.followUpsDue}</p>
                        <p className="text-[11px]">Due</p>
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-3 text-muted-foreground">
                        <p className="text-xl font-bold">{summary.rejectedLeads}</p>
                        <p className="text-[11px]">Rejected</p>
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-3 text-muted-foreground">
                        <p className="text-xl font-bold">{summary.coldPoolLeads}</p>
                        <p className="text-[11px]">Cold pool</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {trendCopy.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{trendCopy.description}</p>
                </div>
                <BarChart3 className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  {trendRows.every(row => row.leads === 0 && row.calls === 0 && row.visits === 0 && row.conversions === 0) ? (
                    <EmptyBlock message="Trend data will appear once this employee has assigned leads or activity." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendRows} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                        <Line type="monotone" dataKey="leads" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} name="Leads" />
                        <Line type="monotone" dataKey="calls" stroke="var(--color-success)" strokeWidth={2.5} dot={false} name="Calls" />
                        <Line type="monotone" dataKey="visits" stroke="var(--color-warning)" strokeWidth={2.5} dot={false} name="Visits" />
                        <Line type="monotone" dataKey="conversions" stroke="var(--color-destructive)" strokeWidth={2.5} dot={false} name="Conversions" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Period Comparison
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Lead volume by period</p>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={PERIODS.map(period => ({
                        period: period.label,
                        leads: data?.periods?.[period.key]?.totalLeads ?? 0,
                        calls: data?.periods?.[period.key]?.callsLogged ?? 0,
                      }))}
                      margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="period" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                      <Bar dataKey="leads" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Leads" />
                      <Bar dataKey="calls" fill="var(--color-success)" radius={[4, 4, 0, 0]} name="Calls" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Recent Handled Leads
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Latest leads currently or previously owned by this employee</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {(data?.recentLeads ?? []).length === 0 ? (
                <EmptyBlock message="No assigned leads found for this employee." />
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {(data?.recentLeads ?? []).map(lead => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="flex min-w-0 gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/50"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs gold-gradient">{initials(lead.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{lead.full_name ?? "Unknown lead"}</p>
                          <Badge variant="outline" className="h-5 capitalize">
                            {pretty(lead.status)}
                          </Badge>
                          <Badge variant={lead.ownership_status === "current" ? "secondary" : "outline"} className="h-5 capitalize">
                            {lead.ownership_status === "current" ? "Current" : "Previous"}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {lead.phone && (
                            <ProtectedPhone value={lead.phone} className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {formatPhone(lead.phone)}
                            </ProtectedPhone>
                          )}
                          <span>{lead.city ?? lead.campaign_name ?? "No location"}</span>
                          <span>Assigned {formatDate(lead.assigned_at)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md bg-success/10 px-2 py-1 capitalize text-success">
                            {pretty(lead.call_status)}
                          </span>
                          <span className="rounded-md bg-primary/10 px-2 py-1 capitalize text-primary">
                            {pretty(lead.hwc)}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-1 capitalize text-muted-foreground">
                            Follow-up {formatDate(lead.follow_up_date)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </motion.div>
  )
}
