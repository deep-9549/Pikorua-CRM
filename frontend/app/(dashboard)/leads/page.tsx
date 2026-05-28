"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Users, Phone, Mail, MapPin, Clock, Flame,
  Thermometer, Snowflake, ChevronRight, Loader2, AlertCircle,
  RefreshCw, UserCheck, Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  status: "unassigned" | "assigned"
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string } | null
  crm?: {
    call_status: string | null
    hwc: string | null
    follow_up_date: string | null
    buying_status: string | null
  }
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

function HWCBadge({ hwc }: { hwc: string | null }) {
  if (!hwc) return null
  const map = {
    hot: { label: "Hot", icon: Flame, color: "var(--color-destructive)", bg: "rgb(185 28 28 / 0.12)", border: "rgb(185 28 28 / 0.3)" },
    warm: { label: "Warm", icon: Thermometer, color: "var(--color-warning)", bg: "rgb(217 119 6 / 0.12)", border: "rgb(217 119 6 / 0.3)" },
    cold: { label: "Cold", icon: Snowflake, color: "var(--color-muted-foreground)", bg: "rgb(154 52 18 / 0.12)", border: "rgb(154 52 18 / 0.3)" },
  }
  const m = map[hwc as keyof typeof map]
  if (!m) return null
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  )
}

function CallStatusBadge({ status }: { status: string | null }) {
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<MetaLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/meta")
      if (!res.ok) throw new Error("Failed to load leads")
      const json = await res.json()
      setLeads(json.leads ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = leads.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.full_name?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.campaign_name?.toLowerCase().includes(q)
    )
  })

  // Group by follow-up date urgency
  const today = new Date().toISOString().split("T")[0]
  const overdue = filtered.filter(l => l.crm?.follow_up_date && l.crm.follow_up_date < today)
  const dueToday = filtered.filter(l => l.crm?.follow_up_date === today)
  const rest = filtered.filter(l => !l.crm?.follow_up_date || l.crm.follow_up_date > today)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            My Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchLeads} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

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
            {search ? "No leads match your search" : "No leads assigned yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <Section title="Overdue Follow-ups" accentColor="var(--color-destructive)" leads={overdue} />
          )}
          {/* Due today */}
          {dueToday.length > 0 && (
            <Section title="Follow up Today" accentColor="var(--color-warning)" leads={dueToday} />
          )}
          {/* Rest */}
          {rest.length > 0 && (
            <Section title={overdue.length + dueToday.length > 0 ? "Others" : "All Leads"} accentColor="var(--color-primary)" leads={rest} />
          )}
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
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
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
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-foreground)" }}>
                      {lead.full_name ?? "Unknown"}
                    </p>
                    <HWCBadge hwc={lead.crm?.hwc ?? null} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        <Phone className="w-3 h-3" />{lead.phone}
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
                <div className="shrink-0 text-right space-y-1">
                  <CallStatusBadge status={lead.crm?.call_status ?? null} />
                  {lead.crm?.follow_up_date && (
                    <p className="flex items-center justify-end gap-1 text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.crm.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  )}
                  {!lead.crm?.call_status && (
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
