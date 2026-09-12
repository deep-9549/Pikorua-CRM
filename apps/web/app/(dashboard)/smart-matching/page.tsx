"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clipboard,
  IndianRupee,
  Lightbulb,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useMetaLeads } from "@/hooks/use-meta-leads"

type CrmDetails = {
  call_status?: string | null
  buying_status?: string | null
  site_visit_status?: string | null
  budget_range?: string | null
  configuration?: string[] | null
  preferred_locations?: string[] | null
  current_area?: string | null
  current_city?: string | null
  profession?: string | null
  company_name?: string | null
  project_name?: string | null
  remarks?: string | null
  follow_up_date?: string | null
}

type Lead = {
  id: string
  client_id: string | null
  full_name: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: string
  received_at: string
  client_status?: string | null
  crm: CrmDetails | null
}

type ClientProfile = {
  id: string
  full_name: string | null
  city: string | null
  status: string | null
  status_note: string | null
  tier: string | null
  total_inquiries: number
  first_seen_at: string | null
  last_seen_at: string | null
}

type ClientDetail = {
  client: ClientProfile
  leads: Lead[]
}

type UnitConfiguration = {
  configuration?: string | null
  area_sqft?: string | null
  carpet_area_sqft?: string | null
  price?: string | null
  price_min?: number | string | null
}

type PropertyRecommendation = {
  property: {
    id: string
    name: string
    type: string
    location: string
    area?: string | null
    price: number | string
    status: string
    developer?: string | null
    roi?: number | string | null
    sampleHouse?: boolean | null
    unitConfigurations?: UnitConfiguration[] | null
  }
  score: number
  match_reasons: string[]
  pitch_points: string[]
  warnings: string[]
  matched_units: UnitConfiguration[]
}

type AiProjectStrategy = {
  property_id: string
  project_name: string
  priority: number
  why_now: string
  pitch_angle: string
  watchout: string
}

type AiSmartInsights = {
  source: "openrouter" | "calculated"
  fallback_reason?: string
  executive_summary: string
  special_insights: Array<{ title: string; insight: string; evidence: string }>
  project_strategy: AiProjectStrategy[]
  pitch_plan: {
    opening: string
    discovery_questions: string[]
    talking_points: string[]
    objection_responses: Array<{ objection: string; response: string }>
    close: string
  }
  next_action: string
}

type ClientOption = {
  clientId: string
  leadId: string
  name: string
  city: string | null
  campaign: string | null
  lastInquiry: string
}

type Preferences = {
  budget: string | null
  configurations: string[]
  locations: string[]
  currentArea: string | null
  currentCity: string | null
  buyingStatus: string | null
  callStatus: string | null
  siteVisitStatus: string | null
  profession: string | null
  company: string | null
  previousProject: string | null
  remarks: string | null
  followUpDate: string | null
}

const STATUS_LABELS: Record<string, string> = {
  super_hot: "Super Hot",
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  postponed: "Postponed",
  lost: "Lost",
  low_budget: "Low budget",
  not_interested: "Not interested",
  broker: "Broker",
  construction_biz_owner: "Construction business owner",
  ready: "Ready to buy",
  interested: "Interested",
  still_searching: "Still searching",
}

function readable(value: string | null | undefined, fallback = "Not captured") {
  if (!value) return fallback
  return STATUS_LABELS[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not recorded"
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatPrice(value: number | string) {
  const price = Number(value)
  if (!Number.isFinite(price)) return String(value)
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(price % 10_000_000 === 0 ? 0 : 1)} Cr`
  if (price >= 100_000) return `₹${(price / 100_000).toFixed(price % 100_000 === 0 ? 0 : 1)} L`
  return `₹${price.toLocaleString("en-IN")}`
}

function firstUseful<T>(leads: Lead[], pick: (lead: Lead) => T | null | undefined): T | null {
  for (const lead of leads) {
    const value = pick(lead)
    if (Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "") return value as T
  }
  return null
}

function buildPreferences(leads: Lead[]): Preferences {
  return {
    budget: firstUseful(leads, lead => lead.crm?.budget_range),
    configurations: firstUseful(leads, lead => lead.crm?.configuration) ?? [],
    locations: firstUseful(leads, lead => lead.crm?.preferred_locations) ?? [],
    currentArea: firstUseful(leads, lead => lead.crm?.current_area),
    currentCity: firstUseful(leads, lead => lead.crm?.current_city) ?? firstUseful(leads, lead => lead.city),
    buyingStatus: firstUseful(leads, lead => lead.crm?.buying_status),
    callStatus: firstUseful(leads, lead => lead.crm?.call_status),
    siteVisitStatus: firstUseful(leads, lead => lead.crm?.site_visit_status),
    profession: firstUseful(leads, lead => lead.crm?.profession),
    company: firstUseful(leads, lead => lead.crm?.company_name),
    previousProject: firstUseful(leads, lead => lead.crm?.project_name),
    remarks: firstUseful(leads, lead => lead.crm?.remarks),
    followUpDate: firstUseful(leads, lead => lead.crm?.follow_up_date),
  }
}

function isBrokerClient(client: ClientProfile, leads: Lead[], preferences: Preferences) {
  return [
    client.status,
    preferences.buyingStatus,
    ...leads.flatMap(lead => [lead.client_status, lead.crm?.buying_status]),
  ].some(value => value === "broker")
}

function buildSummary(client: ClientProfile, leads: Lead[], preferences: Preferences) {
  if (isBrokerClient(client, leads, preferences)) {
    return `${client.full_name ?? "This client"} is marked as Broker. Treat this as a red-flag lead, block normal buyer follow-ups, and do not share inventory, pricing, or project shortlist details unless a super admin explicitly clears the record.`
  }

  const location = preferences.locations.length > 0
    ? preferences.locations.join(", ")
    : preferences.currentArea ?? preferences.currentCity
  const intent = readable(client.status ?? preferences.buyingStatus, "unclassified intent").toLowerCase()
  const repeatSignal = leads.length > 1 ? `a repeat client with ${leads.length} enquiries` : "a first-time enquiry"
  const requirement = [preferences.configurations.join(" / "), location, preferences.budget]
    .filter(Boolean)
    .join(" in ")

  return `${client.full_name ?? "This client"} is ${repeatSignal} and currently shows ${intent}. ${
    requirement ? `The strongest recorded requirement is ${requirement}.` : "Their core property requirement is not fully captured yet."
  } ${
    preferences.siteVisitStatus === "visited"
      ? "They have already completed a site visit, so the next conversation should focus on comparison and decision blockers."
      : "The next conversation should validate the requirement and move toward a focused project presentation or site visit."
  }`
}

function recommendationConfidence(score: number) {
  // The matcher can award up to 125 points across budget, configuration,
  // location, sales priority, site-visit readiness and data completeness.
  return Math.max(0, Math.min(100, Math.round((score / 125) * 100)))
}

export default function SmartMatchingPage() {
  const { data: visibleLeads = [], isLoading: leadsLoading, error: leadsError, refetch } = useMetaLeads<Lead>(undefined, { includePools: true })
  const [selectedClientId, setSelectedClientId] = useState("")
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [recommendations, setRecommendations] = useState<PropertyRecommendation[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [aiInsights, setAiInsights] = useState<AiSmartInsights | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const clientOptions = useMemo<ClientOption[]>(() => {
    const byClient = new Map<string, ClientOption>()
    const ordered = [...visibleLeads].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())

    for (const lead of ordered) {
      if (!lead.client_id || byClient.has(lead.client_id)) continue
      byClient.set(lead.client_id, {
        clientId: lead.client_id,
        leadId: lead.id,
        name: lead.full_name?.trim() || "Unnamed client",
        city: lead.city,
        campaign: lead.campaign_name,
        lastInquiry: lead.received_at,
      })
    }

    return Array.from(byClient.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [visibleLeads])

  const selectedOption = clientOptions.find(option => option.clientId === selectedClientId) ?? null
  const selectedLeadId = selectedOption?.leadId ?? null
  const preferences = useMemo(() => buildPreferences(detail?.leads ?? []), [detail])
  const missingInputs = [
    !preferences.budget && "budget",
    preferences.configurations.length === 0 && "configuration",
    preferences.locations.length === 0 && !preferences.currentArea && !preferences.currentCity && "preferred location",
  ].filter((value): value is string => Boolean(value))

  useEffect(() => {
    if (!selectedClientId || !selectedLeadId) {
      setDetail(null)
      setRecommendations([])
      setAnalysisError(null)
      setAiInsights(null)
      setAiError(null)
      setAiLoading(false)
      return
    }

    const controller = new AbortController()

    async function analyzeClient() {
      setLoadingAnalysis(true)
      setAnalysisError(null)
      setAiInsights(null)
      setAiError(null)
      setAiLoading(false)
      setCopied(false)

      try {
        const detailResponse = await fetch(`/api/leads/meta/${selectedLeadId}/detail`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const detailPayload = await detailResponse.json().catch(() => ({}))
        if (!detailResponse.ok) throw new Error(detailPayload.message ?? "Unable to load this client")

        if (!detailPayload.client) throw new Error("This lead is not linked to a complete client profile yet")
        const clientDetail: ClientDetail = {
          client: detailPayload.client,
          leads: Array.isArray(detailPayload.history) ? detailPayload.history : [],
        }
        setDetail(clientDetail)
        const inputs = buildPreferences(clientDetail.leads ?? [])
        const params = new URLSearchParams({ limit: "6" })
        if (inputs.budget) params.set("budget_range", inputs.budget)
        if (inputs.configurations.length) params.set("configuration", inputs.configurations.join(","))
        if (inputs.locations.length) params.set("preferred_locations", inputs.locations.join(","))
        if (inputs.currentArea) params.set("current_area", inputs.currentArea)
        if (inputs.currentCity) params.set("current_city", inputs.currentCity)

        const matchResponse = await fetch(
          `/api/leads/meta/${selectedLeadId}/property-recommendations?${params.toString()}`,
          { cache: "no-store", signal: controller.signal },
        )
        const matchPayload = await matchResponse.json().catch(() => ({}))
        if (!matchResponse.ok) throw new Error(matchPayload.message ?? "Unable to match properties")
        const matchedProjects = Array.isArray(matchPayload.recommendations) ? matchPayload.recommendations : []
        setRecommendations(matchedProjects)
        setLoadingAnalysis(false)

        setAiLoading(true)
        try {
          const aiResponse = await fetch(`/api/leads/meta/${selectedLeadId}/ai-smart-insights`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client: clientDetail.client,
              preferences: inputs,
              history: clientDetail.leads,
              recommendations: matchedProjects,
            }),
            signal: controller.signal,
          })
          const aiPayload = await aiResponse.json().catch(() => ({}))
          if (!aiResponse.ok) throw new Error(aiPayload.message ?? "AI analysis is temporarily unavailable")
          setAiInsights(aiPayload as AiSmartInsights)
        } catch (error) {
          if (!controller.signal.aborted) {
            setAiError(error instanceof Error ? error.message : "AI analysis is temporarily unavailable")
          }
        } finally {
          if (!controller.signal.aborted) setAiLoading(false)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setDetail(null)
        setRecommendations([])
        setAiInsights(null)
        setAnalysisError(error instanceof Error ? error.message : "Unable to prepare client insights")
      } finally {
        if (!controller.signal.aborted) setLoadingAnalysis(false)
      }
    }

    void analyzeClient()
    return () => controller.abort()
  }, [selectedClientId, selectedLeadId])

  const clientSummary = detail ? buildSummary(detail.client, detail.leads, preferences) : ""
  const brokerRedFlag = detail ? isBrokerClient(detail.client, detail.leads, preferences) : false
  const topProject = recommendations[0]
  const openingLine = topProject
    ? `I shortlisted ${topProject.property.name} because it aligns with ${[
        preferences.budget,
        preferences.configurations.join(" / "),
        preferences.locations.join(" / ") || preferences.currentArea,
      ].filter(Boolean).join(", ") || "what we discussed"}. Before I walk you through it, may I confirm what matters most in your final decision?`
    : "Before I suggest a project, may I quickly reconfirm your budget, preferred location, configuration and buying timeline?"

  async function copyPitchPlan() {
    if (!detail) return
    const projectLines = recommendations.slice(0, 3).map((item, index) => (
      `${index + 1}. ${item.property.name}: ${aiInsights?.project_strategy.find(strategy => strategy.property_id === item.property.id)?.pitch_angle ?? item.pitch_points.join(" ")}`
    ))
    const text = [
      `Client: ${detail.client.full_name ?? "Unnamed client"}`,
      `Summary: ${aiInsights?.executive_summary ?? clientSummary}`,
      `Opening: ${aiInsights?.pitch_plan.opening ?? openingLine}`,
      "Projects to pitch:",
      ...projectLines,
      `Close: ${aiInsights?.pitch_plan.close ?? "Which of these feels closest to what you want? I can arrange a focused site visit for the best two options."}`,
    ].join("\n\n")
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5"><Sparkles className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-semibold">Client Smart Matching</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Choose a CRM client to get a sales-ready summary, live project recommendations, and a practical pitch plan.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start lg:self-auto" onClick={() => void refetch()} disabled={leadsLoading}>
          <RefreshCw className={`h-4 w-4 ${leadsLoading ? "animate-spin" : ""}`} /> Refresh clients
        </Button>
      </motion.div>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.035]">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium"><UserRound className="h-4 w-4 text-primary" /> Select client</label>
              <SearchableSelect
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                options={clientOptions.map(option => ({
                  value: option.clientId,
                  label: <span>{option.name}<span className="ml-2 text-xs text-muted-foreground">{option.city || option.campaign || "CRM client"}</span></span>,
                  searchText: `${option.name} ${option.city ?? ""} ${option.campaign ?? ""}`,
                }))}
                placeholder={leadsLoading ? "Loading clients..." : "Search and choose a client..."}
                searchPlaceholder="Search by client name, city or campaign..."
                emptyMessage="No accessible CRM client found."
                disabled={leadsLoading || clientOptions.length === 0}
                triggerClassName="h-11 bg-background"
              />
            </div>
            {selectedOption && (
              <Button asChild variant="outline" className="gap-2"><Link href={`/leads/${selectedOption.leadId}`}>Open client record <ArrowRight className="h-4 w-4" /></Link></Button>
            )}
          </div>
          {leadsError && <p className="mt-3 text-sm text-destructive">Unable to load clients. Please refresh and try again.</p>}
          {!leadsLoading && !leadsError && clientOptions.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No client-linked leads are currently available to you.</p>}
        </CardContent>
      </Card>

      {!selectedClientId && (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center px-6 py-16 text-center">
          <Target className="mb-4 h-11 w-11 text-primary/45" />
          <h2 className="text-lg font-semibold">Start with a client</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">The analysis combines their latest requirement, past enquiries, buying signals and the live property inventory.</p>
        </CardContent></Card>
      )}

      {loadingAnalysis && (
        <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Preparing client insights and matching live projects...</CardContent></Card>
      )}

      {analysisError && !loadingAnalysis && (
        <Card className="border-destructive/30"><CardContent className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-medium">Analysis could not be prepared</p><p className="mt-1 text-sm text-muted-foreground">{analysisError}</p></div></CardContent></Card>
      )}

      {detail && !loadingAnalysis && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightStat icon={TrendingUp} label="Client signal" value={readable(detail.client.status ?? preferences.buyingStatus)} note={detail.client.status_note || "Based on the latest CRM status"} />
            <InsightStat icon={IndianRupee} label="Recorded budget" value={preferences.budget || "Not captured"} note={missingInputs.includes("budget") ? "Confirm before presenting prices" : "Used for live matching"} />
            <InsightStat icon={MapPin} label="Location preference" value={preferences.locations.join(", ") || preferences.currentArea || preferences.currentCity || "Not captured"} note={preferences.currentCity && preferences.currentCity !== preferences.currentArea ? `Current city: ${preferences.currentCity}` : "Used for project priority"} />
            <InsightStat icon={Building2} label="Configuration" value={preferences.configurations.join(", ") || "Not captured"} note={`${detail.leads.length} ${detail.leads.length === 1 ? "enquiry" : "enquiries"} since ${formatDate(detail.client.first_seen_at)}`} />
          </div>

          {missingInputs.length > 0 && !brokerRedFlag && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div><p className="text-sm font-medium">Confirm {missingInputs.join(", ")} before the final pitch</p><p className="mt-1 text-xs text-muted-foreground">Projects below are still useful for discovery, but filling these fields will make the ranking more precise.</p></div>
            </div>
          )}

          {brokerRedFlag && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Broker red flag: block from active sales follow-up</p>
                <p className="mt-1 text-xs leading-5 text-destructive/85">Do not pitch projects or share inventory/pricing. Keep this record in broker handling unless a super admin clears it.</p>
              </div>
            </div>
          )}

          <Card className="overflow-hidden border-violet-500/25 bg-gradient-to-br from-violet-500/[0.07] via-card to-primary/[0.04]">
            <CardHeader className="border-b border-violet-500/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-500" /> AI Sales Copilot</CardTitle><p className="mt-1 text-xs text-muted-foreground">Personalized reasoning layered on top of the CRM’s verified project ranking.</p></div>
                {aiInsights && <div className="flex flex-col items-start gap-1 sm:items-end"><Badge variant={aiInsights.source === "openrouter" ? "default" : "secondary"}>{aiInsights.source === "openrouter" ? "Live AI analysis" : "Calculated fallback"}</Badge>{aiInsights.fallback_reason && <p className="max-w-md text-left text-[11px] leading-4 text-amber-600 dark:text-amber-400 sm:text-right">{aiInsights.fallback_reason}</p>}</div>}
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {aiLoading ? (
                <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /> AI is reviewing client signals, project fit and likely objections...</div>
              ) : aiError ? (
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" /><div><p className="text-sm font-medium">AI advice is unavailable</p><p className="mt-1 text-xs text-muted-foreground">{aiError}. The verified CRM analysis below is still available.</p></div></div>
              ) : aiInsights ? (
                <div className="space-y-6">
                  <p className="text-sm leading-6">{aiInsights.executive_summary}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {aiInsights.special_insights.map(item => <div key={item.title} className="rounded-xl border border-violet-500/15 bg-background/55 p-4"><p className="text-sm font-semibold">{item.title}</p><p className="mt-2 text-xs leading-5 text-foreground/85">{item.insight}</p><p className="mt-2 text-[11px] leading-4 text-muted-foreground"><span className="font-medium">Evidence:</span> {item.evidence}</p></div>)}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-violet-500/15 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Personalized opening</p><p className="mt-2 text-sm leading-6">“{aiInsights.pitch_plan.opening}”</p><p className="mt-4 text-xs font-semibold">Discovery questions</p><ul className="mt-2 space-y-2">{aiInsights.pitch_plan.discovery_questions.map(question => <li key={question} className="flex gap-2 text-xs leading-5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-500" />{question}</li>)}</ul></div>
                    <div className="rounded-xl border border-violet-500/15 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Objection coaching</p><div className="mt-2 space-y-3">{aiInsights.pitch_plan.objection_responses.map(item => <div key={item.objection}><p className="text-xs font-medium">If they say: “{item.objection}”</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.response}</p></div>)}</div><div className="mt-4 rounded-lg bg-violet-500/10 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">Best next action</p><p className="mt-1 text-xs leading-5">{aiInsights.next_action}</p></div></div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Client summary & special insights</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-6 text-foreground/90">{clientSummary}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Signal label="Engagement pattern" value={detail.leads.length > 1 ? `Repeat interest across ${detail.leads.length} enquiries` : "Single enquiry so far"} />
                  <Signal label="Buying stage" value={readable(preferences.buyingStatus ?? detail.client.status)} />
                  <Signal label="Site visit" value={readable(preferences.siteVisitStatus, "No visit recorded")} />
                  <Signal label="Next follow-up" value={formatDate(preferences.followUpDate)} />
                  <Signal label="Professional context" value={[preferences.profession, preferences.company].filter(Boolean).join(" at ") || "Not captured"} />
                  <Signal label="Previously discussed" value={preferences.previousProject || "No project recorded"} />
                </div>
                {preferences.remarks && <div className="rounded-lg bg-muted/45 p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest useful note</p><p className="mt-1 text-sm">{preferences.remarks}</p></div>}
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquareText className="h-4 w-4 text-primary" /> Reliable pitch framework</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <PitchStep number="1" title="Open with relevance" text={openingLine} />
                <PitchStep number="2" title="Ask one decision question" text={preferences.siteVisitStatus === "visited" ? "What stopped you from moving ahead after the visit: price, layout, location, possession or comparison with another project?" : "Which matters most now: exact location, configuration, total budget, possession timeline or investment upside?"} />
                <PitchStep number="3" title="Present only the best 2–3" text="Lead with the strongest match, explain why it fits, then use the second option as a deliberate comparison—not a catalogue dump." />
                <PitchStep number="4" title="Close for action" text="Which option feels closest to your requirement? I can arrange a focused site visit for the best two and confirm live inventory before we go." />
                <Button className="w-full gap-2" onClick={() => void copyPitchPlan()}><Clipboard className="h-4 w-4" /> {copied ? "Pitch plan copied" : "Copy complete pitch plan"}</Button>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Target className="h-5 w-5 text-primary" /> Projects to pitch next</h2><p className="mt-1 text-sm text-muted-foreground">Ranked from live inventory using the client’s recorded budget, configuration and location.</p></div>
              <Button asChild variant="outline" size="sm"><Link href="/properties">Open property inventory</Link></Button>
            </div>

            {recommendations.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-10 text-center"><Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" /><p className="font-medium">No safe live match found</p><p className="mt-1 text-sm text-muted-foreground">Confirm the missing requirement fields or review inventory availability before promising a project.</p></CardContent></Card>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {recommendations.map((recommendation, index) => (
                  <ProjectCard key={recommendation.property.id} recommendation={recommendation} rank={index + 1} aiStrategy={aiInsights?.project_strategy.find(strategy => strategy.property_id === recommendation.property.id)} />
                ))}
              </div>
            )}
          </section>
        </motion.div>
      )}
    </div>
  )
}

function InsightStat({ icon: Icon, label, value, note }: { icon: typeof UserRound; label: string; value: string; note: string }) {
  return <Card><CardContent className="p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold" title={value}>{value}</p><p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{note}</p></div></div></CardContent></Card>
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/60 p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
}

function PitchStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{number}</span><div><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div></div>
}

function ProjectCard({ recommendation, rank, aiStrategy }: { recommendation: PropertyRecommendation; rank: number; aiStrategy?: AiProjectStrategy }) {
  const property = recommendation.property
  const matchedConfigurations = recommendation.matched_units.map(unit => unit.configuration).filter(Boolean)
  const confidence = recommendationConfidence(recommendation.score)

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/70 transition-colors hover:border-primary/35">
      <div className="border-b bg-gradient-to-br from-primary/10 via-primary/[0.03] to-transparent p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{rank}</span><div className="min-w-0"><h3 className="truncate font-semibold">{property.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {[property.location, property.area].filter(Boolean).join(", ")}</p></div></div>
          <Badge variant="secondary" className="shrink-0">{confidence}% fit</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Badge>{readable(property.type)}</Badge><Badge variant="outline">{formatPrice(property.price)}</Badge><Badge variant="outline">{readable(property.status)}</Badge></div>
      </div>
      <CardContent className="flex flex-1 flex-col space-y-4 p-4">
        <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Why it fits</p><ul className="mt-2 space-y-1.5">{recommendation.match_reasons.slice(0, 4).map(reason => <li key={reason} className="flex gap-2 text-xs leading-5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />{reason}</li>)}</ul></div>
        <div className="rounded-lg bg-primary/[0.055] p-3"><p className="flex items-center gap-2 text-xs font-semibold"><Lightbulb className="h-3.5 w-3.5 text-primary" /> Best pitch angle</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{recommendation.pitch_points[1] ?? recommendation.pitch_points[0]}</p>{recommendation.pitch_points[3] && <p className="mt-1 text-xs leading-5 text-muted-foreground">{recommendation.pitch_points[3]}</p>}</div>
        {aiStrategy && <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3"><p className="flex items-center gap-2 text-xs font-semibold text-violet-500"><Sparkles className="h-3.5 w-3.5" /> AI project strategy</p><p className="mt-2 text-xs leading-5">{aiStrategy.pitch_angle}</p><p className="mt-2 text-[11px] leading-4 text-muted-foreground"><span className="font-medium">Why now:</span> {aiStrategy.why_now}</p></div>}
        {matchedConfigurations.length > 0 && <p className="text-xs"><span className="font-medium">Relevant units:</span> {Array.from(new Set(matchedConfigurations)).join(", ")}</p>}
        <div className="mt-auto border-t pt-3"><p className="flex items-start gap-2 text-[11px] leading-4 text-amber-600 dark:text-amber-400"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{recommendation.warnings[0] ?? "Confirm latest inventory and availability before commitment."}</p></div>
      </CardContent>
    </Card>
  )
}
