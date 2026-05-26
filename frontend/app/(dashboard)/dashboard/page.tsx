"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, Users, Building2, CreditCard,
  MessageSquare, Target, Sparkles, ArrowUpRight, Calendar,
  Phone, BarChart3, Flame, Star, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  dashboardStats, revenueData, employees, leads,
  siteVisits, formatCurrency, formatNumber, getStatusColor
} from "@/lib/data"
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts"

/* ── Animation variants ──────────────────────────────── */
const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const rise = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45 } }
}

/* ── Stat Card ─────────────────────────────────────────── */
interface StatCardProps {
  title: string
  value: string
  change: number
  trend: "up" | "down"
  icon: React.ElementType
  iconBg: string
  iconColor: string
  suffix?: string
}

function StatCard({ title, value, change, trend, icon: Icon, iconBg, iconColor, suffix }: StatCardProps) {
  return (
    <motion.div variants={rise}>
      <Card className="relative overflow-hidden card-lift shadow-card border-0">
        {/* Side accent line */}
        <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
          style={{ background: "linear-gradient(180deg, var(--color-primary) 0%, transparent 100%)", opacity: 0.5 }} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
              <Icon className={cn("w-4.5 h-4.5", iconColor)} style={{ width: 18, height: 18 }} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground mb-2">
            {value}{suffix}
          </p>
          <div className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
            trend === "up"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          )}>
            {trend === "up"
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {change}% vs last month
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Revenue Chart ─────────────────────────────────────── */
function RevenueChart() {
  return (
    <motion.div variants={rise}>
      <Card className="shadow-card border-0 card-lift">
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-5 px-5">
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Revenue Overview</CardTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">Monthly closed deals</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[12px] text-primary gap-1 -mt-0.5">
            Full Report <ArrowUpRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-3">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.660 0.120 75)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="oklch(0.660 0.120 75)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.900 0.012 80)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fill: "oklch(0.52 0.008 260)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: "oklch(0.52 0.008 260)", fontSize: 11 }}
                  tickFormatter={v => `${(v / 10000000).toFixed(0)}Cr`} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="glass shadow-luxury-lg rounded-xl p-3 text-sm">
                      <p className="font-semibold text-foreground mb-0.5">{payload[0].payload.month}</p>
                      <p className="text-[15px] font-bold gold-text">{formatCurrency(payload[0].value as number)}</p>
                      <p className="text-[11px] text-muted-foreground">{payload[0].payload.conversions} closings</p>
                    </div>
                  )
                }} />
                <Area type="monotone" dataKey="revenue"
                  stroke="oklch(0.660 0.120 75)" strokeWidth={2.5}
                  fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Leads Chart ───────────────────────────────────────── */
function LeadsChart() {
  return (
    <motion.div variants={rise}>
      <Card className="shadow-card border-0 card-lift">
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-5 px-5">
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Lead Pipeline</CardTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">Monthly inbound volume</p>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-3">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.580 0.130 180)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.580 0.130 180)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.900 0.012 80)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fill: "oklch(0.52 0.008 260)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: "oklch(0.52 0.008 260)", fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="glass shadow-luxury-lg rounded-xl p-3 text-sm border border-border/40">
                      <p className="font-semibold text-foreground mb-0.5">{payload[0].payload.month}</p>
                      <p className="text-[15px] font-bold text-primary">{payload[0].value} leads</p>
                    </div>
                  )
                }} />
                <Area type="monotone" dataKey="leads" stroke="oklch(0.580 0.130 180)" fill="url(#colorLeads)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Recent Leads ─────────────────────────────────────── */
function RecentLeads() {
  const recent = leads.slice(0, 5)
  return (
    <motion.div variants={rise}>
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-5 px-5">
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Recent Leads</CardTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">Latest inquiries</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[12px] text-primary gap-1 -mt-0.5">
            View All <ArrowUpRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="space-y-0.5">
            {recent.map((lead) => (
              <div key={lead.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                <Avatar className="h-9 w-9 shrink-0" style={{ border: "1.5px solid var(--color-border)" }}>
                  <AvatarImage src={lead.avatar} />
                  <AvatarFallback className="text-[11px] font-bold bg-primary/8 text-primary">
                    {lead.name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{lead.name}</p>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", getStatusColor(lead.status))}>
                      {lead.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {lead.propertyInterest.join(", ")} · {lead.location}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[13px] font-bold">{lead.aiScore}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">AI score</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Team Leaderboard ─────────────────────────────────── */
function TeamLeaderboard() {
  const sorted = [...employees].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const medals = ["gold-text", "text-platinum", "text-chart-5", "text-muted-foreground", "text-muted-foreground"]

  return (
    <motion.div variants={rise}>
      <Card className="shadow-card border-0">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Team Leaderboard</CardTitle>
          <p className="text-[12px] text-muted-foreground">Top performers this month</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="space-y-1">
            {sorted.map((emp, i) => (
              <div key={emp.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <span className={cn("text-[13px] font-bold w-5 text-center tabular-nums", medals[i])}>
                  {i + 1}
                </span>
                <Avatar className="h-8 w-8 shrink-0" style={{ border: "1.5px solid var(--color-border)" }}>
                  <AvatarImage src={emp.avatar} />
                  <AvatarFallback className="text-[10px]">
                    {emp.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{emp.name}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.leadsConverted} conversions</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-semibold">{formatCurrency(emp.revenue)}</p>
                  <Progress
                    value={Math.min((emp.revenue / emp.target) * 100, 100)}
                    className="h-1 w-16 mt-1.5"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Upcoming Visits ──────────────────────────────────── */
function UpcomingVisits() {
  const visits = siteVisits.filter(v => v.status === "scheduled").slice(0, 4)
  return (
    <motion.div variants={rise}>
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-5 px-5">
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Site Visits</CardTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">Upcoming this week</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[12px] text-primary gap-1 -mt-0.5">
            View All <ArrowUpRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1 space-y-2">
          {visits.map(v => (
            <div key={v.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer">
              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
                style={{ background: "oklch(0.660 0.120 75 / 0.08)", border: "1px solid oklch(0.660 0.120 75 / 0.15)" }}>
                <span className="text-[16px] font-bold leading-none" style={{ color: "oklch(0.660 0.120 75)" }}>
                  {v.scheduledDate.getDate()}
                </span>
                <span className="text-[9px] uppercase tracking-wide" style={{ color: "oklch(0.660 0.120 75)" }}>
                  {v.scheduledDate.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{v.leadName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{v.propertyName}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {v.scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── AI Insights ──────────────────────────────────────── */
function AIInsights() {
  const insights = [
    {
      title: "Hot Lead Alert",
      body: "Arjun Mehta shows 92% conversion probability. Recommend immediate follow-up.",
      type: "hot", Icon: Flame
    },
    {
      title: "Revenue Forecast",
      body: "Projected ₹3.2 Cr additional revenue this quarter based on pipeline depth.",
      type: "up", Icon: TrendingUp
    },
    {
      title: "Engagement Gap",
      body: "5 leads haven't been contacted in 7+ days. Schedule follow-ups now.",
      type: "warn", Icon: Clock
    }
  ]
  const colors: Record<string, { bg: string; color: string }> = {
    hot:  { bg: "bg-destructive/8",  color: "text-destructive" },
    up:   { bg: "bg-success/8",      color: "text-success" },
    warn: { bg: "bg-warning/8",      color: "text-warning-foreground" },
  }

  return (
    <motion.div variants={rise}>
      <Card className="shadow-card border-0"
        style={{ background: "linear-gradient(160deg, oklch(0.660 0.120 75 / 0.04) 0%, transparent 60%)" }}>
        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-5 px-5">
          <div className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[oklch(0.10_0.010_260)]" />
          </div>
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">AI Insights</CardTitle>
            <p className="text-[12px] text-muted-foreground">Smart recommendations</p>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1 space-y-1.5">
          {insights.map((ins, i) => {
            const c = colors[ins.type]
            return (
              <div key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-card/60 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
                  <ins.Icon className={cn("w-4 h-4", c.color)} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-tight">{ins.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{ins.body}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Page ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <motion.div variants={fade} initial="hidden" animate="show" className="space-y-6">

      {/* Page header */}
      <motion.div variants={rise} className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-balance">
            {greeting}, Jitendra p.
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Here&apos;s your portfolio snapshot for today.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="outline" size="sm" className="h-8 gap-2 text-[13px]">
            <Calendar className="w-3.5 h-3.5" />
            Jan 2024
          </Button>
          <Button size="sm" className="h-8 gap-2 text-[13px] gold-gradient text-[oklch(0.10_0.010_260)] border-0 shadow-gold-sm font-semibold">
            <Target className="w-3.5 h-3.5" />
            View Targets
          </Button>
        </div>
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue" value={formatCurrency(dashboardStats.totalRevenue)}
          change={dashboardStats.revenueGrowth} trend="up"
          icon={CreditCard} iconBg="bg-primary/8" iconColor="text-primary"
        />
        <StatCard
          title="Total Leads" value={formatNumber(dashboardStats.totalLeads)}
          change={dashboardStats.leadGrowth} trend="up"
          icon={Users} iconBg="bg-chart-2/10" iconColor="text-chart-2"
        />
        <StatCard
          title="Conversion Rate" value={`${dashboardStats.conversionRate}`}
          change={dashboardStats.conversionGrowth} trend="up" suffix="%"
          icon={Target} iconBg="bg-success/10" iconColor="text-success"
        />
        <StatCard
          title="Active Deals" value={formatNumber(dashboardStats.activeDeals)}
          change={dashboardStats.dealGrowth} trend="up"
          icon={Building2} iconBg="bg-chart-5/10" iconColor="text-chart-5"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart />
        <LeadsChart />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <RecentLeads />
        <TeamLeaderboard />
        <div className="space-y-5">
          <UpcomingVisits />
          <AIInsights />
        </div>
      </div>
    </motion.div>
  )
}


