"use client"

import { type ElementType, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArchiveRestore,
  Briefcase,
  Building2,
  Loader2,
  Phone,
  Search,
  Snowflake,
  Trash2,
  TrendingDown,
  UserX,
  X,
} from "lucide-react"
import { useMetaLeads } from "@/hooks/use-meta-leads"
import { formatPhone } from "@/lib/utils"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TrashLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: string
  client_status?: string | null
  received_at: string
  assigned_to_profile?: { id: string; full_name: string } | null
}

const EMPTY_LEADS: TrashLead[] = []

const TRASH_STATUS_META: Record<string, { label: string; icon: ElementType; color: string }> = {
  cold_pool: { label: "Cold", icon: Snowflake, color: "oklch(0.65 0.15 250)" },
  lost_pool: { label: "Lost", icon: TrendingDown, color: "oklch(0.60 0.12 20)" },
  not_interested_pool: { label: "Not Interested", icon: UserX, color: "oklch(0.55 0.08 260)" },
  broker_pool: { label: "Broker", icon: Briefcase, color: "oklch(0.65 0.15 145)" },
  construction_biz_owner_pool: { label: "Construction Owner", icon: Building2, color: "oklch(0.65 0.12 200)" },
}

function sourceLabel(source: string) {
  return source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
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

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function TrashPage() {
  const { data, isLoading, isFetching, error, refetch } = useMetaLeads<TrashLead>(undefined, { trash: true })
  const leads = data ?? EMPTY_LEADS
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")

  const filtered = useMemo(() => leads.filter(lead => {
    if (status && lead.status !== status) return false
    if (!search) return true
    const q = search.toLowerCase()
    return Boolean(
      lead.full_name?.toLowerCase().includes(q) ||
      lead.phone?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.city?.toLowerCase().includes(q) ||
      lead.campaign_name?.toLowerCase().includes(q),
    )
  }), [leads, search, status])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Trash
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            {filtered.length} of {leads.length} pooled lead{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Object.entries(TRASH_STATUS_META).map(([key, meta]) => {
          const Icon = meta.icon
          return (
            <Card key={key} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{meta.label}</p>
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <p className="mt-2 text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
                  {leads.filter(lead => lead.status === key).length}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-muted-foreground)" }} />
          <Input
            placeholder="Search trash leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="h-9 rounded-lg px-2.5 text-xs bg-transparent cursor-pointer"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
        >
          <option value="">All Trash</option>
          {Object.entries(TRASH_STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        {(search || status) && (
          <Button variant="ghost" size="sm" className="gap-1 h-9 text-xs" onClick={() => { setSearch(""); setStatus("") }}>
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{ background: "rgb(185 28 28 / 0.12)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.25)" }}>
          Failed to load trash leads
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Trash2 className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            {search || status ? "No trash leads match your filters" : "No leads in trash"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const meta = TRASH_STATUS_META[lead.status] ?? TRASH_STATUS_META.cold_pool
            const Icon = meta.icon
            return (
              <Link key={lead.id} href={`/leads/${lead.id}?from=trash`}>
                <Card className="shadow-card transition-colors hover:bg-accent/40">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold"
                      style={{ background: "rgb(194 65 12 / 0.10)", color: "var(--color-primary)" }}>
                      {initials(lead.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                          {lead.full_name ?? "Unknown"}
                        </p>
                        <Badge className="gap-1 text-[10px]" style={{ background: meta.color, color: "#fff" }}>
                          <Icon className="h-3 w-3" />{meta.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{sourceLabel(lead.source)}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        {lead.phone && (
                          <ProtectedPhone value={lead.phone} className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />{formatPhone(lead.phone)}
                          </ProtectedPhone>
                        )}
                        {lead.email && <span>{lead.email}</span>}
                        {lead.city && <span>{lead.city}</span>}
                        {lead.assigned_to_profile?.full_name && <span>Last owner: {lead.assigned_to_profile.full_name}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      {lead.campaign_name && <p className="max-w-[180px] truncate text-xs font-medium">{lead.campaign_name}</p>}
                      <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>{timeAgo(lead.received_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
