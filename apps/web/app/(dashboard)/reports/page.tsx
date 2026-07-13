"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Download,
  FileChartColumn,
  Loader2,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { getAuthUser } from "@/lib/auth/cookies"
import {
  CustomEmployeeReport,
  downloadEmployeePerformancePdf,
} from "@/lib/reports/employee-performance-pdf"
import { cn } from "@/lib/utils"

interface Employee {
  id: string
  full_name: string | null
  email: string | null
  status: string | null
}

interface ReportResponse {
  employees: Employee[]
  selectedEmployee: Employee | null
  customReport: CustomEmployeeReport | null
  generatedAt: string
}

const CHART_COLORS = {
  calls: "#ee732d",
  leads: "#3670c6",
  visits: "#805aba",
  conversions: "#28a470",
}

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function change(current: number, previous: number, points = false) {
  if (points) {
    const value = current - previous
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)} pt`
  }
  if (previous === 0) return current === 0 ? "0%" : "New"
  const value = ((current - previous) / previous) * 100
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  delta: string
  icon: React.ElementType
  tone: string
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-card">
      <CardContent className="relative p-4 sm:p-5">
        <div className={cn("absolute inset-x-0 top-0 h-1", tone)} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
          </div>
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
        <Badge variant="secondary" className="mt-3 font-semibold">{delta} vs prior</Badge>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <FileChartColumn className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = React.useState<boolean | null>(null)
  const [employeeId, setEmployeeId] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [data, setData] = React.useState<ReportResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const user = getAuthUser()
    if (!user) {
      router.replace("/login")
      return
    }
    setAuthorized(user.role === "super_admin")
  }, [router])

  const generate = React.useCallback(async () => {
    if (!employeeId || !startDate || !endDate || endDate < startDate) {
      setError("Select an employee and a valid date range.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      params.set("employeeId", employeeId)
      const response = await fetch(`/api/dashboard/employee-performance?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || payload?.error || "Unable to generate report")
      const next = payload as ReportResponse
      setData(next)
      if (next.selectedEmployee?.id) setEmployeeId(next.selectedEmployee.id)
      setDirty(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate report")
    } finally {
      setLoading(false)
    }
  }, [employeeId, endDate, startDate])

  React.useEffect(() => {
    if (authorized !== true) return

    let cancelled = false
    const loadEmployees = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/dashboard/employee-performance?listOnly=true", { cache: "no-store" })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.message || payload?.error || "Unable to load employees")
        if (!cancelled) setData(payload as ReportResponse)
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load employees")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadEmployees()
    return () => { cancelled = true }
  }, [authorized])

  const exportPdf = () => {
    if (!data?.selectedEmployee || !data.customReport || dirty) return
    setExporting(true)
    try {
      downloadEmployeePerformancePdf({
        employee: data.selectedEmployee,
        report: data.customReport,
        generatedAt: data.generatedAt,
      })
      toast.success("Employee performance PDF exported")
    } catch {
      toast.error("Could not create the PDF")
    } finally {
      setExporting(false)
    }
  }

  if (authorized === null) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
  }

  if (!authorized) {
    return (
      <Card className="mx-auto mt-16 max-w-lg border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-9 w-9 text-destructive" />
          <h1 className="text-xl font-semibold">Super admin access only</h1>
          <p className="text-sm text-muted-foreground">Employee reports include protected performance analytics.</p>
        </CardContent>
      </Card>
    )
  }

  const report = data?.customReport
  const summary = report?.summary
  const previous = report?.previousSummary
  const comparisonData = report ? [
    { name: "Leads", current: report.summary.totalLeads, previous: report.previousSummary.totalLeads },
    { name: "Calls", current: report.summary.callsLogged, previous: report.previousSummary.callsLogged },
    { name: "Visits", current: report.summary.siteVisitsCompleted, previous: report.previousSummary.siteVisitsCompleted },
    { name: "Converted", current: report.summary.convertedLeads, previous: report.previousSummary.convertedLeads },
  ] : []
  const callMix = report ? [
    { name: "Spoken", value: report.summary.spokenCalls, color: "#28a470" },
    { name: "Not spoken", value: report.summary.notSpokenCalls, color: "#d24848" },
    { name: "Callback", value: report.summary.callbackCalls, color: "#ee732d" },
  ].filter(item => item.value > 0) : []

  return (
    <div className="space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                <FileChartColumn className="h-4 w-4" /> Report studio
              </div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Employee Performance Reports</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">Custom range. Transfer-safe attribution. Visual-first PDF.</p>
            </div>
            <Button size="lg" onClick={exportPdf} disabled={!report || dirty || loading || exporting} className="w-full bg-orange-500 text-white hover:bg-orange-600 lg:w-auto">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_minmax(160px,1fr)_minmax(160px,1fr)_auto] lg:items-end lg:p-6">
          <div className="space-y-2">
            <Label>Employee</Label>
            <SearchableSelect
              value={employeeId}
              onValueChange={(value) => { setEmployeeId(value); setDirty(true) }}
              options={(data?.employees ?? []).map(employee => ({
                value: employee.id,
                label: employee.full_name || employee.email || "Unnamed employee",
              }))}
              searchPlaceholder="Search employees..."
              triggerClassName="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-start">From</Label>
            <Input id="report-start" type="date" value={startDate} max={endDate || localDate(new Date())} onChange={(event) => { setStartDate(event.target.value); setDirty(true) }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-end">To</Label>
            <Input id="report-end" type="date" value={endDate} min={startDate} max={localDate(new Date())} onChange={(event) => { setEndDate(event.target.value); setDirty(true) }} />
          </div>
          <Button onClick={() => void generate()} disabled={loading || !employeeId || !startDate || !endDate} className="w-full lg:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Analyze
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading && !report ? (
        <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !report || !summary || !previous ? (
        <EmptyState message="Select an employee and date range to build the report." />
      ) : (
        <>
          {dirty && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning-foreground">
              <CalendarRange className="h-4 w-4" /> Filters changed. Analyze again before exporting.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Assigned leads" value={summary.totalLeads.toLocaleString("en-IN")} delta={change(summary.totalLeads, previous.totalLeads)} icon={Users} tone="bg-blue-500" />
            <StatCard label="Calls logged" value={summary.callsLogged.toLocaleString("en-IN")} delta={change(summary.callsLogged, previous.callsLogged)} icon={PhoneCall} tone="bg-orange-500" />
            <StatCard label="Conversions" value={summary.convertedLeads.toLocaleString("en-IN")} delta={change(summary.convertedLeads, previous.convertedLeads)} icon={Target} tone="bg-emerald-500" />
            <StatCard label="Conversion rate" value={`${summary.conversionRate.toFixed(1)}%`} delta={change(summary.conversionRate, previous.conversionRate, true)} icon={Activity} tone="bg-violet-500" />
          </div>

          <Card className="border-border/60 shadow-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Activity trend</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{report.range.days} days across calls, leads, visits and conversions</p>
              </div>
              <Badge variant="outline">Transfer-safe</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.trend} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: "hsl(var(--border))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="calls" stroke={CHART_COLORS.calls} strokeWidth={3} dot={false} name="Calls" />
                    <Line type="monotone" dataKey="leads" stroke={CHART_COLORS.leads} strokeWidth={2} dot={false} name="Leads" />
                    <Line type="monotone" dataKey="visits" stroke={CHART_COLORS.visits} strokeWidth={2} dot={false} name="Visits" />
                    <Line type="monotone" dataKey="conversions" stroke={CHART_COLORS.conversions} strokeWidth={2} dot={false} name="Conversions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card className="border-border/60 shadow-card">
              <CardHeader><CardTitle className="text-base">Current vs previous period</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, borderColor: "hsl(var(--border))" }} />
                      <Legend />
                      <Bar dataKey="current" name="Current" fill="#ee732d" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="previous" name="Previous" fill="#b8c2d1" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-card">
              <CardHeader><CardTitle className="text-base">Call outcomes</CardTitle></CardHeader>
              <CardContent>
                {callMix?.length ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={callMix} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>
                          {callMix.map(item => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyState message="No call outcomes in this range." />}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 shadow-card">
              <CardHeader><CardTitle className="text-base">Efficiency relations</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {[
                  ["Callback share", report.ratios.callbackRate, "bg-blue-500"],
                  ["Contact rate", report.ratios.contactRate, "bg-orange-500"],
                  ["Visit completion", report.ratios.visitCompletionRate, "bg-violet-500"],
                  ["Conversion", report.ratios.conversionRate, "bg-emerald-500"],
                ].map(([label, value, color]) => (
                  <div key={String(label)}>
                    <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><strong>{Number(value).toFixed(1)}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, Number(value))}%` }} /></div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Calls / lead</p><p className="mt-1 text-xl font-bold">{report.ratios.callsPerLead.toFixed(2)}</p></div>
                  <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Calls / conversion</p><p className="mt-1 text-xl font-bold">{report.ratios.callsPerConversion.toFixed(2)}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-card">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Key signals</CardTitle>
                <Badge variant="secondary">{report.insights.source === "openrouter" ? "AI" : "Calculated"}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.insights.items.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</div>
                    <p className="pt-1 text-sm font-medium">{item}</p>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Target className="h-4 w-4 text-primary" /> Recommended actions
                </div>
                {report.insights.actions.map((action, index) => (
                  <div key={action} className="flex items-start gap-3 rounded-xl bg-primary/5 p-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</div>
                    <p className="pt-1 text-sm font-medium">{action}</p>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                  <div className="rounded-xl bg-orange-500/10 p-3"><PhoneCall className="mx-auto h-4 w-4 text-orange-600" /><p className="mt-2 text-lg font-bold">{summary.followUpsDue}</p><p className="text-[11px] text-muted-foreground">Follow-ups</p></div>
                  <div className="rounded-xl bg-emerald-500/10 p-3"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" /><p className="mt-2 text-lg font-bold">{summary.siteVisitsCompleted}</p><p className="text-[11px] text-muted-foreground">Visits done</p></div>
                  <div className="rounded-xl bg-blue-500/10 p-3"><BarChart3 className="mx-auto h-4 w-4 text-blue-600" /><p className="mt-2 text-lg font-bold">{summary.hotLeads}</p><p className="text-[11px] text-muted-foreground">Hot leads</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
