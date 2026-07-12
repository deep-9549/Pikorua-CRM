"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BriefcaseBusiness, Building2, CalendarClock, ChevronRight, Crown, Diamond,
  Filter, Mail, MapPin, MessageCircle, MoreHorizontal, Phone, Plus, Search,
  ShieldCheck, Sparkles, Star, Trophy, UserRound, UsersRound, X,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ProtectedPhone } from "@/components/security/protected-phone"

type Activity = { id: string; activityType: string; title: string; notes?: string; occurredAt: string; actor?: { fullName?: string } }
type HniProfile = {
  id: string; fullName: string; category: string; designation?: string; organisation?: string; city?: string; country?: string
  phone?: string; email?: string; assistantName?: string; assistantPhone?: string; tier: string; relationshipStage: string
  relationshipOwnerId?: string; owner?: { fullName?: string }; estimatedPortfolioValue?: string; estimatedBudgetMin?: string
  estimatedBudgetMax?: string; propertiesOwned: number; preferences: string[]; interests: string[]; communicationPreferences?: string
  relationshipNotes?: string; source?: string; lastContactAt?: string; nextActionAt?: string; nextAction?: string; isSensitive: boolean
  activities?: Activity[]; updatedAt: string
}
type Employee = { id: string; full_name?: string; user_profiles?: { full_name?: string } }

const categories = ["all", "business", "celebrity", "sports", "politics", "royalty", "professional", "other"]
const categoryLabel: Record<string, string> = { all: "All profiles", business: "Business", celebrity: "Celebrities", sports: "Sports", politics: "Public figures", royalty: "Royalty", professional: "Professionals", other: "Other" }
const categoryIcon: Record<string, typeof Crown> = { business: BriefcaseBusiness, celebrity: Star, sports: Trophy, politics: UsersRound, royalty: Crown, professional: UserRound, other: Sparkles }
const stageStyles: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-700", introduced: "bg-blue-50 text-blue-700", engaged: "bg-violet-50 text-violet-700",
  active: "bg-amber-50 text-amber-700", client: "bg-emerald-50 text-emerald-700", dormant: "bg-rose-50 text-rose-700",
}

const emptyForm = {
  full_name: "", category: "business", designation: "", organisation: "", city: "", country: "India", phone: "", email: "",
  assistant_name: "", assistant_phone: "", tier: "platinum", relationship_stage: "prospect", relationship_owner_id: "",
  estimated_portfolio_value: "", estimated_budget_min: "", estimated_budget_max: "", properties_owned: "0", preferences: "",
  interests: "", communication_preferences: "", relationship_notes: "", source: "", next_action_at: "", next_action: "", is_sensitive: true,
}

const money = (value?: string | number) => {
  const n = Number(value || 0)
  if (!n) return "—"
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 ? 1 : 0)} Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 ? 1 : 0)} L`
  return `₹${n.toLocaleString("en-IN")}`
}
const initials = (name: string) => name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
const dateText = (value?: string) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—"
const dueText = (value?: string) => {
  if (!value) return "No action scheduled"
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return "Due today"
  return `Due in ${days}d`
}

export default function HniClientsPage() {
  const [profiles, setProfiles] = useState<HniProfile[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [stage, setStage] = useState("all")
  const [selected, setSelected] = useState<HniProfile | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [interaction, setInteraction] = useState({ activity_type: "call", title: "", notes: "" })

  async function load() {
    setLoading(true)
    try {
      const [hniRes, employeeRes] = await Promise.all([fetch("/api/hni"), fetch("/api/employees")])
      if (!hniRes.ok) throw new Error("Unable to load VIP profiles")
      const hniJson = await hniRes.json()
      const employeeJson = employeeRes.ok ? await employeeRes.json() : []
      setProfiles(hniJson.profiles || [])
      setEmployees(Array.isArray(employeeJson) ? employeeJson : employeeJson.employees || [])
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load profiles") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => profiles.filter((profile) => {
    const haystack = [profile.fullName, profile.organisation, profile.designation, profile.city, profile.owner?.fullName].join(" ").toLowerCase()
    return haystack.includes(query.toLowerCase()) && (category === "all" || profile.category === category) && (stage === "all" || profile.relationshipStage === stage)
  }), [profiles, query, category, stage])
  const upcoming = profiles.filter((p) => p.nextActionAt && new Date(p.nextActionAt).getTime() <= Date.now() + 7 * 86_400_000).length
  const active = profiles.filter((p) => ["engaged", "active", "client"].includes(p.relationshipStage)).length
  const portfolio = profiles.reduce((sum, p) => sum + Number(p.estimatedPortfolioValue || 0), 0)

  function openCreate() { setSelected(null); setForm(emptyForm); setEditorOpen(true) }
  function openEdit(profile: HniProfile) {
    setSelected(profile)
    setForm({
      full_name: profile.fullName, category: profile.category, designation: profile.designation || "", organisation: profile.organisation || "",
      city: profile.city || "", country: profile.country || "India", phone: profile.phone || "", email: profile.email || "",
      assistant_name: profile.assistantName || "", assistant_phone: profile.assistantPhone || "", tier: profile.tier,
      relationship_stage: profile.relationshipStage, relationship_owner_id: profile.relationshipOwnerId || "",
      estimated_portfolio_value: profile.estimatedPortfolioValue || "", estimated_budget_min: profile.estimatedBudgetMin || "",
      estimated_budget_max: profile.estimatedBudgetMax || "", properties_owned: String(profile.propertiesOwned || 0),
      preferences: (profile.preferences || []).join(", "), interests: (profile.interests || []).join(", "),
      communication_preferences: profile.communicationPreferences || "", relationship_notes: profile.relationshipNotes || "", source: profile.source || "",
      next_action_at: profile.nextActionAt ? new Date(profile.nextActionAt).toISOString().slice(0, 16) : "", next_action: profile.nextAction || "", is_sensitive: profile.isSensitive,
    })
    setEditorOpen(true)
  }
  async function saveProfile() {
    if (!form.full_name.trim()) return toast.error("Full name is required")
    setSaving(true)
    const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean)
    const number = (value: string) => value ? Number(value) : undefined
    const payload = { ...form, relationship_owner_id: form.relationship_owner_id || undefined, preferences: list(form.preferences), interests: list(form.interests),
      properties_owned: Number(form.properties_owned || 0), estimated_portfolio_value: number(form.estimated_portfolio_value),
      estimated_budget_min: number(form.estimated_budget_min), estimated_budget_max: number(form.estimated_budget_max),
      next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : undefined }
    try {
      const response = await fetch(selected ? `/api/hni/${selected.id}` : "/api/hni", { method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error((await response.json()).message || "Could not save profile")
      toast.success(selected ? "VIP profile updated" : "VIP profile added")
      setEditorOpen(false); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save profile") }
    finally { setSaving(false) }
  }
  async function addInteraction() {
    if (!selected || !interaction.title.trim()) return toast.error("Interaction title is required")
    setSaving(true)
    try {
      const response = await fetch(`/api/hni/${selected.id}/activities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(interaction) })
      if (!response.ok) throw new Error("Could not log interaction")
      const detail = await fetch(`/api/hni/${selected.id}`).then((r) => r.json())
      setSelected(detail.profile); setInteraction({ activity_type: "call", title: "", notes: "" }); setInteractionOpen(false)
      toast.success("Interaction logged"); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not log interaction") }
    finally { setSaving(false) }
  }

  return <div className="space-y-6 pb-10">
    <section className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,.16),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--card)))] p-5 sm:rounded-3xl sm:p-6 md:p-8">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-amber-400/20" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-amber-700"><ShieldCheck className="h-4 w-4" /> Restricted relationship intelligence</div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">HNI & VIP Relationships</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">A private command centre for the people who matter most—business leaders, celebrities, athletes, public figures and trusted circles.</p></div>
        <Button size="lg" onClick={openCreate} className="w-full gap-2 bg-amber-700 text-white hover:bg-amber-800 sm:w-auto"><Plus className="h-4 w-4" />Add VIP profile</Button>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Elite profiles", value: profiles.length, Icon: Crown, note: "Total protected records" },
        { label: "Active relationships", value: active, Icon: Sparkles, note: "Engaged and current clients" },
        { label: "Actions due", value: upcoming, Icon: CalendarClock, note: "Due in the next 7 days" },
        { label: "Known portfolio", value: money(portfolio), Icon: Diamond, note: "Recorded relationship value" },
      ].map(({ label, value, Icon, note }) => <Card key={label} className="border-border/60 shadow-none"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div><div className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Icon className="h-5 w-5" /></div></CardContent></Card>)}
    </div>

    <Card className="border-border/60 shadow-none"><CardContent className="p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search by name, organisation, city or relationship owner…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap"><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full sm:w-[165px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{categoryLabel[item]}</SelectItem>)}</SelectContent></Select>
      <Select value={stage} onValueChange={setStage}><SelectTrigger className="w-full sm:w-[155px]"><SelectValue placeholder="Relationship" /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{["prospect", "introduced", "engaged", "active", "client", "dormant"].map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent></Select></div>
    </div></CardContent></Card>

    <Card className="overflow-hidden border-border/60 shadow-none">
      {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map((n) => <Skeleton key={n} className="h-16 w-full" />)}</div> : filtered.length === 0 ? <div className="flex min-h-[310px] flex-col items-center justify-center px-6 text-center"><div className="rounded-2xl bg-amber-50 p-4 text-amber-700"><Crown className="h-7 w-7" /></div><h3 className="mt-4 font-semibold">{profiles.length ? "No profiles match these filters" : "Your private network starts here"}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{profiles.length ? "Try broadening your search or clearing a filter." : "Add the first VIP profile to begin building relationship history and actionable intelligence."}</p>{!profiles.length && <Button onClick={openCreate} className="mt-5 gap-2"><Plus className="h-4 w-4" />Add first profile</Button>}</div> : <><div className="hidden md:block"><Table>
        <TableHeader><TableRow className="bg-muted/35"><TableHead className="pl-6">Profile</TableHead><TableHead>Relationship</TableHead><TableHead>Investment view</TableHead><TableHead>Owner</TableHead><TableHead>Next action</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
        <TableBody>{filtered.map((profile) => { const Icon = categoryIcon[profile.category] || Sparkles; return <TableRow key={profile.id} className="group cursor-pointer" onClick={() => setSelected(profile)}>
          <TableCell className="pl-6"><div className="flex items-center gap-3"><Avatar className="h-11 w-11 border border-amber-200"><AvatarFallback className="bg-amber-50 text-sm font-semibold text-amber-800">{initials(profile.fullName)}</AvatarFallback></Avatar><div><div className="flex items-center gap-2"><p className="font-medium">{profile.fullName}</p>{profile.isSensitive && <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />}</div><p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{[profile.designation, profile.organisation].filter(Boolean).join(" · ") || categoryLabel[profile.category]}</p></div></div></TableCell>
          <TableCell><Badge variant="secondary" className={`${stageStyles[profile.relationshipStage]} border-0 capitalize`}>{profile.relationshipStage}</Badge><p className="mt-1 text-xs text-muted-foreground">{profile.tier} tier</p></TableCell>
          <TableCell><p className="font-medium">{money(profile.estimatedBudgetMax || profile.estimatedPortfolioValue)}</p><p className="mt-0.5 text-xs text-muted-foreground">{profile.preferences?.slice(0,2).join(" · ") || "Preferences not added"}</p></TableCell>
          <TableCell><p className="text-sm">{profile.owner?.fullName || "Unassigned"}</p><p className="mt-0.5 text-xs text-muted-foreground">{profile.city || profile.country || "Location unknown"}</p></TableCell>
          <TableCell><p className="text-sm font-medium">{profile.nextAction || "No action"}</p><p className={`mt-0.5 text-xs ${profile.nextActionAt && new Date(profile.nextActionAt) < new Date() ? "text-rose-600" : "text-muted-foreground"}`}>{dueText(profile.nextActionAt)}</p></TableCell>
          <TableCell><Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Button></TableCell>
        </TableRow>})}</TableBody>
      </Table></div><div className="divide-y md:hidden">{filtered.map((profile) => { const Icon = categoryIcon[profile.category] || Sparkles; return <button type="button" key={profile.id} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/35" onClick={() => setSelected(profile)}><Avatar className="h-11 w-11 shrink-0 border border-amber-200"><AvatarFallback className="bg-amber-50 text-sm font-semibold text-amber-800">{initials(profile.fullName)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-medium">{profile.fullName}</p>{profile.isSensitive && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-700" />}</div><p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Icon className="h-3 w-3 shrink-0" />{[profile.designation, profile.organisation].filter(Boolean).join(" · ") || categoryLabel[profile.category]}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="secondary" className={`${stageStyles[profile.relationshipStage]} border-0 capitalize`}>{profile.relationshipStage}</Badge><span className="text-xs text-muted-foreground">{money(profile.estimatedBudgetMax || profile.estimatedPortfolioValue)}</span></div><div className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{profile.owner?.fullName || "Unassigned"}</span><span className={profile.nextActionAt && new Date(profile.nextActionAt) < new Date() ? "shrink-0 text-rose-600" : "shrink-0 text-muted-foreground"}>{dueText(profile.nextActionAt)}</span></div></div><ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" /></button>})}</div></>}
    </Card>

    <Sheet open={!!selected && !editorOpen} onOpenChange={(open) => !open && setSelected(null)}><SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
      {selected && <><SheetHeader className="border-b bg-gradient-to-br from-amber-50 to-background p-4 text-left sm:p-6"><div className="flex flex-wrap items-start gap-3 sm:gap-4"><Avatar className="h-14 w-14 border-2 border-amber-200 sm:h-16 sm:w-16"><AvatarFallback className="bg-white text-xl font-semibold text-amber-800">{initials(selected.fullName)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-zinc-900 text-white capitalize">{selected.tier}</Badge><Badge variant="secondary" className={`${stageStyles[selected.relationshipStage]} border-0 capitalize`}>{selected.relationshipStage}</Badge></div><SheetTitle className="break-words text-xl sm:text-2xl">{selected.fullName}</SheetTitle><p className="mt-1 text-sm text-muted-foreground">{[selected.designation, selected.organisation].filter(Boolean).join(" at ") || categoryLabel[selected.category]}</p></div><Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => openEdit(selected)}>Edit profile</Button></div></SheetHeader>
      <div className="p-6"><div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Portfolio", money(selected.estimatedPortfolioValue)], ["Buying range", money(selected.estimatedBudgetMax)], ["Properties", selected.propertiesOwned], ["Last contact", dateText(selected.lastContactAt)]].map(([a,b]) => <div key={String(a)} className="rounded-xl border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{a}</p><p className="mt-1 font-semibold">{b}</p></div>)}</div>
      <Tabs defaultValue="intelligence"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="intelligence">Intelligence</TabsTrigger><TabsTrigger value="contact">Access</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger></TabsList>
        <TabsContent value="intelligence" className="mt-5 space-y-5"><section><Label className="text-xs uppercase tracking-wider text-muted-foreground">Investment preferences</Label><div className="mt-2 flex flex-wrap gap-2">{selected.preferences?.length ? selected.preferences.map((item) => <Badge key={item} variant="outline">{item}</Badge>) : <p className="text-sm text-muted-foreground">No preferences recorded.</p>}</div></section><Separator /><section><Label className="text-xs uppercase tracking-wider text-muted-foreground">Personal interests</Label><div className="mt-2 flex flex-wrap gap-2">{selected.interests?.length ? selected.interests.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <p className="text-sm text-muted-foreground">No interests recorded.</p>}</div></section><Separator /><section><Label className="text-xs uppercase tracking-wider text-muted-foreground">Relationship intelligence</Label><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.relationshipNotes || "No private relationship notes yet."}</p></section><div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Next best action</p><p className="mt-1 font-medium">{selected.nextAction || "No follow-up planned"}</p><p className="mt-1 text-xs text-amber-800/70">{selected.nextActionAt ? `${dateText(selected.nextActionAt)} · ${dueText(selected.nextActionAt)}` : "Add a date to keep this relationship warm."}</p></div></TabsContent>
        <TabsContent value="contact" className="mt-5 space-y-4"><Contact icon={Phone} label="Direct phone"><ProtectedPhone value={selected.phone || ""}>{selected.phone || "Not recorded"}</ProtectedPhone></Contact><Contact icon={Mail} label="Private email">{selected.email || "Not recorded"}</Contact><Contact icon={MapPin} label="Location">{[selected.city, selected.country].filter(Boolean).join(", ") || "Not recorded"}</Contact><Contact icon={UserRound} label="Relationship owner">{selected.owner?.fullName || "Unassigned"}</Contact><Separator /><h4 className="text-sm font-semibold">Gatekeeper / assistant</h4><Contact icon={UsersRound} label={selected.assistantName || "Assistant"}><ProtectedPhone value={selected.assistantPhone || ""}>{selected.assistantPhone || "Not recorded"}</ProtectedPhone></Contact><p className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Contact data is restricted to super admins and protected against casual copying.</p></TabsContent>
        <TabsContent value="timeline" className="mt-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-semibold">Relationship history</h4><p className="text-xs text-muted-foreground">Every meaningful touchpoint in one place</p></div><Button size="sm" className="w-full sm:w-auto" onClick={() => setInteractionOpen(true)}><Plus className="mr-1 h-4 w-4" />Log interaction</Button></div><div className="space-y-1">{selected.activities?.length ? selected.activities.map((event) => <div key={event.id} className="relative flex gap-3 border-l-2 border-amber-200 py-3 pl-4"><div className="absolute -left-[5px] top-5 h-2 w-2 rounded-full bg-amber-600" /><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{event.title}</p><Badge variant="outline" className="text-[10px] capitalize">{event.activityType.replace("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{dateText(event.occurredAt)}{event.actor?.fullName ? ` · ${event.actor.fullName}` : ""}</p>{event.notes && <p className="mt-2 text-sm leading-5">{event.notes}</p>}</div></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No interactions logged yet.</p>}</div></TabsContent>
      </Tabs></div></>}
    </SheetContent></Sheet>

    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[calc(100dvh-0.75rem)] max-w-4xl overflow-hidden p-0 sm:max-h-[92vh]"><DialogHeader className="border-b px-4 py-4 sm:px-6 sm:py-5"><DialogTitle>{selected ? "Edit VIP profile" : "Add VIP profile"}</DialogTitle></DialogHeader><ScrollArea className="max-h-[calc(100dvh-145px)] sm:max-h-[calc(92vh-145px)]"><div className="space-y-7 p-4 sm:p-6"><FormSection title="Identity" description="Who they are and how your team knows them"><div className="grid gap-4 md:grid-cols-2"><Field label="Full name *"><Input value={form.full_name} onChange={(e) => setForm({...form, full_name:e.target.value})} /></Field><Field label="Category"><Select value={form.category} onValueChange={(value) => setForm({...form, category:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.slice(1).map((item) => <SelectItem key={item} value={item}>{categoryLabel[item]}</SelectItem>)}</SelectContent></Select></Field><Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({...form, designation:e.target.value})} /></Field><Field label="Organisation"><Input value={form.organisation} onChange={(e) => setForm({...form, organisation:e.target.value})} /></Field><Field label="City"><Input value={form.city} onChange={(e) => setForm({...form, city:e.target.value})} /></Field><Field label="Source / introduction"><Input placeholder="Who introduced this relationship?" value={form.source} onChange={(e) => setForm({...form, source:e.target.value})} /></Field></div></FormSection>
      <FormSection title="Relationship management" description="Ownership, access level and the next move"><div className="grid gap-4 md:grid-cols-3"><Field label="Tier"><Select value={form.tier} onValueChange={(value) => setForm({...form,tier:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["platinum","diamond","black"].map((item)=><SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Stage"><Select value={form.relationship_stage} onValueChange={(value) => setForm({...form,relationship_stage:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["prospect","introduced","engaged","active","client","dormant"].map((item)=><SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Relationship owner"><Select value={form.relationship_owner_id || "unassigned"} onValueChange={(value) => setForm({...form,relationship_owner_id:value === "unassigned" ? "" : value})}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{employees.map((employee)=><SelectItem key={employee.id} value={employee.id}>{employee.full_name || employee.user_profiles?.full_name || "Team member"}</SelectItem>)}</SelectContent></Select></Field><Field label="Next action"><Input placeholder="Private viewing, introduction…" value={form.next_action} onChange={(e)=>setForm({...form,next_action:e.target.value})} /></Field><Field label="Action date"><Input type="datetime-local" value={form.next_action_at} onChange={(e)=>setForm({...form,next_action_at:e.target.value})} /></Field><Field label="Preferred communication"><Input placeholder="Via assistant, WhatsApp only…" value={form.communication_preferences} onChange={(e)=>setForm({...form,communication_preferences:e.target.value})} /></Field></div></FormSection>
      <FormSection title="Contact & gatekeeper" description="Sensitive direct and assistant contact details"><div className="grid gap-4 md:grid-cols-2"><Field label="Direct phone"><Input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} /></Field><Field label="Private email"><Input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} /></Field><Field label="Assistant / gatekeeper"><Input value={form.assistant_name} onChange={(e)=>setForm({...form,assistant_name:e.target.value})} /></Field><Field label="Assistant phone"><Input value={form.assistant_phone} onChange={(e)=>setForm({...form,assistant_phone:e.target.value})} /></Field></div></FormSection>
      <FormSection title="Investment intelligence" description="Useful context for precise, high-touch matching"><div className="grid gap-4 md:grid-cols-2"><Field label="Estimated portfolio value"><Input type="number" value={form.estimated_portfolio_value} onChange={(e)=>setForm({...form,estimated_portfolio_value:e.target.value})} /></Field><Field label="Properties owned"><Input type="number" min="0" value={form.properties_owned} onChange={(e)=>setForm({...form,properties_owned:e.target.value})} /></Field><Field label="Buying range — minimum"><Input type="number" value={form.estimated_budget_min} onChange={(e)=>setForm({...form,estimated_budget_min:e.target.value})} /></Field><Field label="Buying range — maximum"><Input type="number" value={form.estimated_budget_max} onChange={(e)=>setForm({...form,estimated_budget_max:e.target.value})} /></Field><Field label="Property preferences"><Input placeholder="Sea-facing, penthouse, discreet entry (comma separated)" value={form.preferences} onChange={(e)=>setForm({...form,preferences:e.target.value})} /></Field><Field label="Personal interests"><Input placeholder="Golf, art, philanthropy (comma separated)" value={form.interests} onChange={(e)=>setForm({...form,interests:e.target.value})} /></Field><div className="md:col-span-2"><Field label="Private relationship notes"><Textarea rows={5} placeholder="Relationship context, family office, decision style, sensitivities and do-not-contact windows…" value={form.relationship_notes} onChange={(e)=>setForm({...form,relationship_notes:e.target.value})} /></Field></div></div></FormSection></div></ScrollArea><div className="flex flex-col-reverse gap-2 border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6"><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button disabled={saving} onClick={saveProfile} className="bg-amber-700 text-white hover:bg-amber-800">{saving ? "Saving…" : selected ? "Save changes" : "Create VIP profile"}</Button></div></DialogContent></Dialog>

    <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Log interaction</DialogTitle></DialogHeader><div className="space-y-4 py-2"><Field label="Type"><Select value={interaction.activity_type} onValueChange={(value)=>setInteraction({...interaction,activity_type:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["call","meeting","message","note","introduction","site_visit","deal"].map((item)=><SelectItem key={item} value={item} className="capitalize">{item.replace("_"," ")}</SelectItem>)}</SelectContent></Select></Field><Field label="Summary"><Input placeholder="Discussed private viewing" value={interaction.title} onChange={(e)=>setInteraction({...interaction,title:e.target.value})} /></Field><Field label="Notes"><Textarea rows={4} value={interaction.notes} onChange={(e)=>setInteraction({...interaction,notes:e.target.value})} /></Field><Button className="w-full" disabled={saving} onClick={addInteraction}>{saving ? "Saving…" : "Add to timeline"}</Button></div></DialogContent></Dialog>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section><div className="mb-4"><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>{children}</section> }
function Contact({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) { return <div className="flex items-center gap-3 rounded-xl border p-3"><div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">{label}</p><div className="text-sm font-medium">{children}</div></div></div> }
