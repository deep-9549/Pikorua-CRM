"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Headphones,
  Languages,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { formatPhone } from "@/lib/utils"

type VoiceLabel = "hot" | "warm" | "cold"

type VoiceScore = {
  id: string
  score: number
  label_ai: VoiceLabel
  label_override: VoiceLabel | null
  effective_label: VoiceLabel
  override_reason: string | null
  timeline: string
  rationale: string | null
  signals_positive: string[]
  signals_negative: string[]
  source: string
  scored_at: string | null
}

type VoiceQueueItem = {
  id: string
  call_id: string
  crm_lead_id: string
  lead_name: string | null
  phone: string | null
  campaign_name: string | null
  direction: "inbound" | "outbound"
  locale: string | null
  reviewed: boolean
  dnc: boolean
  status: string | null
  duration_sec: number | null
  recording_url: string | null
  answered_at: string | null
  received_at: string
  assigned_to_profile: { id: string; full_name: string | null } | null
  score: VoiceScore | null
}

type TranscriptTurn = {
  id: string
  index: number
  role: "caller" | "assistant" | "system"
  text: string
  locale: string | null
  telemetry: {
    stt_ms: number | null
    llm_ms: number | null
    tts_ms: number | null
    tokens_prompt: number | null
    tokens_completion: number | null
    guardrail_flags: string[]
  }
}

type VoiceCallDetail = VoiceQueueItem & {
  exotel_call_sid: string | null
  hangup_cause: string | null
  from_number: string | null
  to_number: string | null
  queued_at: string | null
  initiated_at: string | null
  ended_at: string | null
  transfer_target: string | null
  consent_to_recording: boolean | null
  transcript_turns: TranscriptTurn[]
}

type VoiceAlert = {
  id: string
  type: string
  at: string
  read: boolean
  detail: Record<string, unknown>
  lead: { id: string; full_name: string | null; phone: string | null } | null
}

const EMPTY_FILTERS = {
  label: "",
  timeline: "",
  locale: "",
  campaign: "",
  direction: "",
  reviewed: "",
  assignedTo: "",
  hotAlerts: "",
  dateFrom: "",
  dateTo: "",
}

type Filters = typeof EMPTY_FILTERS

const labelStyles: Record<VoiceLabel, string> = {
  hot: "bg-red-600 text-white border-red-600",
  warm: "bg-amber-100 text-amber-800 border-amber-300",
  cold: "bg-slate-100 text-slate-700 border-slate-300",
}

function labelText(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "Unknown"
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "No date"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function duration(value: number | null | undefined) {
  if (!value) return "0s"
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border bg-transparent px-2.5 text-xs"
      style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
    >
      {children}
    </select>
  )
}

function LabelBadge({ label }: { label: VoiceLabel | null | undefined }) {
  if (!label) return <Badge variant="outline">No score</Badge>
  return <Badge className={labelStyles[label]}>{label.toUpperCase()}</Badge>
}

export default function AiVoicePage() {
  const [items, setItems] = useState<VoiceQueueItem[]>([])
  const [alerts, setAlerts] = useState<VoiceAlert[]>([])
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS })
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<VoiceCallDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [overrideLabel, setOverrideLabel] = useState<VoiceLabel>("hot")
  const [overrideReason, setOverrideReason] = useState("")
  const [savingOverride, setSavingOverride] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    return params.toString()
  }, [filters])

  const loadQueue = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-voice/queue${query ? `?${query}` : ""}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to load AI voice queue")
      setItems(json.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI voice queue")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [query])

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-voice/alerts?unread=true", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setAlerts(json.alerts ?? [])
    } catch {}
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/ai-voice/calls/${id}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to load call")
      setDetail(json.call)
      setOverrideLabel(json.call?.score?.effective_label ?? "hot")
      setOverrideReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call")
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    void loadAlerts()
    const timer = window.setInterval(() => void loadAlerts(), 45_000)
    return () => window.clearInterval(timer)
  }, [loadAlerts])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => [
      item.lead_name,
      item.phone,
      item.campaign_name,
      item.call_id,
      item.score?.rationale,
    ].some((value) => value?.toLowerCase().includes(q)))
  }, [items, search])

  const campaigns = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.campaign_name).filter(Boolean))) as string[]
  }, [items])

  const assignees = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((item) => {
      if (item.assigned_to_profile?.id) {
        map.set(item.assigned_to_profile.id, item.assigned_to_profile.full_name ?? "Unnamed")
      }
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [items])

  const stats = useMemo(() => {
    return {
      total: items.length,
      hot: items.filter((item) => item.score?.effective_label === "hot").length,
      unreviewed: items.filter((item) => !item.reviewed).length,
      alerts: alerts.length,
    }
  }, [alerts.length, items])

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function setReviewed(call: VoiceCallDetail, reviewed: boolean) {
    const res = await fetch(`/api/ai-voice/calls/${call.id}/reviewed`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewed }),
    })
    if (res.ok) {
      setDetail((prev) => prev ? { ...prev, reviewed } : prev)
      setItems((prev) => prev.map((item) => item.id === call.id ? { ...item, reviewed } : item))
    }
  }

  async function saveOverride() {
    if (!detail?.score?.id || !overrideReason.trim()) return
    setSavingOverride(true)
    try {
      const res = await fetch(`/api/ai-voice/scores/${detail.score.id}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: overrideLabel, reason: overrideReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to save override")
      await loadDetail(detail.id)
      await loadQueue(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save override")
    } finally {
      setSavingOverride(false)
    }
  }

  async function markAlertRead(alertId: string) {
    await fetch(`/api/ai-voice/alerts/${alertId}/read`, { method: "PATCH" })
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient text-primary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-primary)" }}>
              AI Voice
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
              {stats.unreviewed} unreviewed calls
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadQueue(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgb(220 38 38 / 0.24)", background: "rgb(220 38 38 / 0.08)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <Flame className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">{alerts.length} hot alert{alerts.length === 1 ? "" : "s"}</span>
            {alerts.slice(0, 3).map((alert) => (
              <button
                key={alert.id}
                onClick={() => {
                  if (alert.lead?.id) {
                    const call = items.find((item) => item.crm_lead_id === alert.lead?.id)
                    if (call) void loadDetail(call.id)
                  }
                  void markAlertRead(alert.id)
                }}
                className="rounded-md border bg-white/70 px-2 py-1 text-xs text-red-800"
              >
                {alert.lead?.full_name || "Voice lead"} - {formatDateTime(alert.at)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Voice Calls", value: stats.total, icon: Headphones, color: "var(--color-primary)" },
          { label: "Hot", value: stats.hot, icon: Flame, color: "rgb(220 38 38)" },
          { label: "Unreviewed", value: stats.unreviewed, icon: Clock, color: "rgb(217 119 6)" },
          { label: "Alerts", value: stats.alerts, icon: AlertTriangle, color: "rgb(185 28 28)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              </div>
              <Icon className="h-6 w-6 opacity-70" style={{ color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-3">
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
            <div className="flex flex-col gap-2 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-muted-foreground)" }} />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search calls..." className="h-9 pl-9" />
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterSelect value={filters.label} onChange={(value) => setFilter("label", value)}>
                  <option value="">All labels</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </FilterSelect>
                <FilterSelect value={filters.reviewed} onChange={(value) => setFilter("reviewed", value)}>
                  <option value="">All review</option>
                  <option value="false">Unreviewed</option>
                  <option value="true">Reviewed</option>
                </FilterSelect>
                <FilterSelect value={filters.direction} onChange={(value) => setFilter("direction", value)}>
                  <option value="">Any direction</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </FilterSelect>
                <FilterSelect value={filters.locale} onChange={(value) => setFilter("locale", value)}>
                  <option value="">Any locale</option>
                  <option value="hi">Hindi</option>
                  <option value="en">English</option>
                  <option value="gu">Gujarati</option>
                </FilterSelect>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" style={{ color: "var(--color-muted-foreground)" }} />
              <FilterSelect value={filters.timeline} onChange={(value) => setFilter("timeline", value)}>
                <option value="">Any timeline</option>
                <option value="immediate">Immediate</option>
                <option value="short_term">Short term</option>
                <option value="long_term">Long term</option>
                <option value="exploring">Exploring</option>
                <option value="unknown">Unknown</option>
              </FilterSelect>
              <FilterSelect value={filters.campaign} onChange={(value) => setFilter("campaign", value)}>
                <option value="">Any campaign</option>
                {campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
              </FilterSelect>
              <FilterSelect value={filters.assignedTo} onChange={(value) => setFilter("assignedTo", value)}>
                <option value="">Any assignee</option>
                {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
              </FilterSelect>
              <FilterSelect value={filters.hotAlerts} onChange={(value) => setFilter("hotAlerts", value)}>
                <option value="">Any alert state</option>
                <option value="true">Hot only</option>
              </FilterSelect>
              <input type="date" value={filters.dateFrom} onChange={(event) => setFilter("dateFrom", event.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-xs" style={{ borderColor: "var(--color-border)" }} />
              <input type="date" value={filters.dateTo} onChange={(event) => setFilter("dateTo", event.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-xs" style={{ borderColor: "var(--color-border)" }} />
              {Object.values(filters).some(Boolean) && (
                <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs" onClick={() => setFilters({ ...EMPTY_FILTERS })}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm text-red-700" style={{ borderColor: "rgb(185 28 28 / 0.25)", background: "rgb(185 28 28 / 0.08)" }}>
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
            <div className="grid min-w-[760px] grid-cols-[86px_minmax(180px,1fr)_90px_110px_130px_120px] gap-3 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide"
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
              <span>Label</span>
              <span>Lead</span>
              <span>Score</span>
              <span>Call</span>
              <span>Timeline</span>
              <span>Owner</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-primary)" }} />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                No voice calls match the current view
              </div>
            ) : (
              <div className="overflow-x-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => void loadDetail(item.id)}
                    className="grid min-w-[760px] w-full grid-cols-[86px_minmax(180px,1fr)_90px_110px_130px_120px] items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/45"
                    style={{ borderColor: "var(--color-border)", background: selectedId === item.id ? "rgb(194 65 12 / 0.06)" : undefined }}
                  >
                    <div className="flex items-center gap-1.5">
                      <LabelBadge label={item.score?.effective_label} />
                      {!item.reviewed && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                        {item.lead_name || "Unknown lead"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                        {item.phone && (
                          <ProtectedPhone value={item.phone}>
                            <Phone className="mr-1 inline h-3 w-3" />{formatPhone(item.phone)}
                          </ProtectedPhone>
                        )}
                        {item.campaign_name && <span>{item.campaign_name}</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.score?.score ?? "-"}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{item.score?.source ?? ""}</p>
                    </div>
                    <div className="text-xs">
                      <p className="capitalize">{item.direction}</p>
                      <p style={{ color: "var(--color-muted-foreground)" }}>{duration(item.duration_sec)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="capitalize">{labelText(item.score?.timeline)}</p>
                      <p style={{ color: "var(--color-muted-foreground)" }}>{formatDateTime(item.answered_at ?? item.received_at)}</p>
                    </div>
                    <div className="truncate text-xs">
                      {item.assigned_to_profile?.full_name || "Unassigned"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-[520px] rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
          {!selectedId ? (
            <div className="flex h-full min-h-[520px] flex-col items-center justify-center p-8 text-center">
              <Headphones className="mb-3 h-10 w-10 opacity-25" />
              <p className="text-sm font-medium">Select a call</p>
            </div>
          ) : detailLoading ? (
            <div className="flex min-h-[520px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-primary)" }} />
            </div>
          ) : detail ? (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <LabelBadge label={detail.score?.effective_label} />
                    {detail.reviewed && <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Reviewed</Badge>}
                    {detail.dnc && <Badge variant="destructive" className="gap-1"><ShieldCheck className="h-3 w-3" />DNC</Badge>}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-semibold">{detail.lead_name || "Unknown lead"}</h2>
                  <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{detail.call_id}</p>
                </div>
                <Link href={`/leads/${detail.crm_lead_id}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted">
                  CRM <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info icon={Phone} label="Phone" value={detail.phone ? formatPhone(detail.phone) : "No phone"} protectedValue={detail.phone} />
                <Info icon={Calendar} label="Answered" value={formatDateTime(detail.answered_at ?? detail.received_at)} />
                <Info icon={Languages} label="Locale" value={detail.locale?.toUpperCase() ?? "Unknown"} />
                <Info icon={User} label="Owner" value={detail.assigned_to_profile?.full_name || "Unassigned"} />
              </div>

              {detail.score && (
                <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>AI score</p>
                      <p className="text-2xl font-bold">{detail.score.score}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-medium capitalize">{labelText(detail.score.timeline)}</p>
                      <p style={{ color: "var(--color-muted-foreground)" }}>{detail.score.source}</p>
                    </div>
                  </div>
                  {detail.score.rationale && (
                    <p className="mt-3 text-sm leading-relaxed">{detail.score.rationale}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {detail.score.signals_positive.map((signal) => <Badge key={signal} variant="secondary">{signal}</Badge>)}
                    {detail.score.signals_negative.map((signal) => <Badge key={signal} variant="outline">{signal}</Badge>)}
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Workflow</p>
                  <Button size="sm" variant={detail.reviewed ? "outline" : "default"} onClick={() => void setReviewed(detail, !detail.reviewed)}>
                    {detail.reviewed ? "Mark unreviewed" : "Mark reviewed"}
                  </Button>
                </div>
                {detail.score && (
                  <div className="grid gap-2">
                    <FilterSelect value={overrideLabel} onChange={(value) => setOverrideLabel(value as VoiceLabel)}>
                      <option value="hot">Hot</option>
                      <option value="warm">Warm</option>
                      <option value="cold">Cold</option>
                    </FilterSelect>
                    <Textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)}
                      placeholder="Override reason..." className="min-h-[70px]" />
                    <Button size="sm" disabled={!overrideReason.trim() || savingOverride} onClick={() => void saveOverride()}>
                      {savingOverride ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save override
                    </Button>
                    {detail.score.label_override && (
                      <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                        Override: {detail.score.label_override.toUpperCase()} - {detail.score.override_reason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {detail.recording_url && detail.consent_to_recording !== false && (
                <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Recording</p>
                    <a href={detail.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <audio controls preload="none" src={detail.recording_url} className="w-full" />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Transcript</p>
                {detail.transcript_turns.length === 0 ? (
                  <p className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
                    No transcript turns stored
                  </p>
                ) : detail.transcript_turns.map((turn) => (
                  <div key={turn.id} className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant={turn.role === "caller" ? "default" : "outline"} className="capitalize">
                        {turn.role}
                      </Badge>
                      <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                        {turn.locale?.toUpperCase() || "NA"} - STT {turn.telemetry.stt_ms ?? 0}ms - LLM {turn.telemetry.llm_ms ?? 0}ms
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.text}</p>
                    {turn.telemetry.guardrail_flags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {turn.telemetry.guardrail_flags.map((flag) => <Badge key={flag} variant="destructive">{flag}</Badge>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function Info({
  icon: Icon,
  label,
  value,
  protectedValue,
}: {
  icon: React.ElementType
  label: string
  value: string
  protectedValue?: string | null
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)" }}>{label}</span>
        {protectedValue ? (
          <ProtectedPhone value={protectedValue} className="block truncate font-medium">{value}</ProtectedPhone>
        ) : (
          <span className="block truncate font-medium">{value}</span>
        )}
      </span>
    </div>
  )
}
