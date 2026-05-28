"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, Users, Clock, UserPlus, RefreshCw, Phone, Mail,
  MapPin, Check, ChevronDown, Loader2, AlertCircle,
  Plus, PenLine
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: "meta_ad" | "manual"
  status: "unassigned" | "assigned"
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string; role: string } | null
}

interface Employee {
  id: string
  full_name: string
  phone: string | null
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Add Lead Dialog Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function AddLeadDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (lead: MetaLead) => void
}) {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", city: "", campaign_name: "", notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setForm({ full_name: "", phone: "", email: "", city: "", campaign_name: "", notes: "" }); setError(null) }
  }, [open])

  function set(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to add lead")
      onAdded(json.lead)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            Add Lead Manually
          </DialogTitle>
          <DialogDescription>
            Add a lead that came in via phone, referral, walk-in, or any other channel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
                Full Name <span style={{ color: "var(--color-primary)" }}>*</span>
              </Label>
              <Input
                placeholder="e.g. Lead Name"
                value={form.full_name}
                onChange={e => set("full_name", e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
                Phone <span style={{ color: "var(--color-primary)" }}>*</span>
              </Label>
              <Input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>City</Label>
              <Input
                placeholder="e.g. Mumbai"
                value={form.city}
                onChange={e => set("city", e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Email</Label>
              <Input
                type="email"
                placeholder="lead@example.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>
                Source / Campaign
              </Label>
              <Input
                placeholder="e.g. Referral, Walk-in, Cold Call, Hoarding..."
                value={form.campaign_name}
                onChange={e => set("campaign_name", e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Notes</Label>
              <Textarea
                placeholder="Any additional info about this lead..."
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                className="text-sm resize-none min-h-[72px]"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.24)" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 gold-gradient font-semibold shadow-gold-sm"
              style={{ color: "var(--color-primary-foreground)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                : <><Plus className="w-4 h-4 mr-2" />Add Lead</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Lead Row Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function LeadRow({
  lead,
  employees,
  assigningId,
  onAssign,
}: {
  lead: MetaLead
  employees: Employee[]
  assigningId: string | null
  onAssign: (leadId: string, empId: string) => void
}) {
  return (
    <motion.div
      key={lead.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs gold-gradient" style={{ color: "var(--color-primary-foreground)" }}>
          {initials(lead.full_name)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium truncate" style={{ color: "var(--color-foreground)" }}>
            {lead.full_name ?? "Unknown"}
          </p>
          {lead.source === "manual" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: "rgb(194 65 12 / 0.10)", color: "var(--color-primary)" }}>
              MANUAL
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {lead.phone && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <Phone className="w-3 h-3" />{lead.phone}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <Mail className="w-3 h-3" />{lead.email}
            </span>
          )}
          {lead.city && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <MapPin className="w-3 h-3" />{lead.city}
            </span>
          )}
        </div>
      </div>

      {/* Campaign + time */}
      <div className="hidden sm:block shrink-0 max-w-[160px] text-right">
        {lead.campaign_name && (
          <Badge variant="secondary" className="text-[10px] truncate max-w-full">
            {lead.campaign_name}
          </Badge>
        )}
        <p className="text-[11px] mt-1" style={{ color: "var(--color-muted-foreground)" }}>
          {timeAgo(lead.received_at)}
        </p>
      </div>

      {/* Assign / assigned */}
      {lead.status === "assigned" && lead.assigned_to_profile ? (
        <div className="flex items-center gap-2 shrink-0">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px]"
              style={{ background: "rgb(21 128 61 / 0.12)", color: "var(--color-success)" }}>
              {initials(lead.assigned_to_profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs hidden md:block" style={{ color: "var(--color-success)" }}>
            {lead.assigned_to_profile.full_name}
          </span>
          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="shrink-0 h-8 gap-1.5 gold-gradient text-[11px] font-semibold shadow-gold-sm"
              style={{ color: "var(--color-primary-foreground)" }}
              disabled={assigningId === lead.id}
            >
              {assigningId === lead.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><UserPlus className="w-3.5 h-3.5" />Assign<ChevronDown className="w-3 h-3" /></>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {employees.length === 0
              ? <DropdownMenuItem disabled>No executives found</DropdownMenuItem>
              : employees.map(emp => (
                <DropdownMenuItem key={emp.id} onClick={() => onAssign(lead.id, emp.id)} className="gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px]">{initials(emp.full_name)}</AvatarFallback>
                  </Avatar>
                  {emp.full_name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function MetaAdsPage() {
  const [leads, setLeads] = useState<MetaLead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("unassigned")
  const [addOpen, setAddOpen] = useState(false)

  const fetchLeads = useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = status ? `/api/leads/meta?status=${status}` : "/api/leads/meta"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch leads")
      const json = await res.json()
      setLeads(json.leads ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        const [leadsRes, empsRes] = await Promise.all([
          fetch("/api/leads/meta?status=unassigned"),
          fetch("/api/employees"),
        ])
        const [leadsJson, empsJson] = await Promise.all([leadsRes.json(), empsRes.json()])
        setLeads(leadsJson.leads ?? [])
        setEmployees(empsJson.employees ?? [])
      } catch {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  async function handleAssign(leadId: string, employeeId: string) {
    setAssigningId(leadId)
    try {
      const res = await fetch(`/api/leads/meta/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: employeeId }),
      })
      if (!res.ok) throw new Error("Assignment failed")
      setLeads(prev => prev.filter(l => l.id !== leadId))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assignment failed")
    } finally {
      setAssigningId(null)
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    fetchLeads(tab === "all" ? undefined : tab)
  }

  function handleLeadAdded(lead: MetaLead) {
    // New leads are unassigned Ã¢â‚¬â€ add to top of list if on unassigned/all tab
    if (activeTab === "unassigned" || activeTab === "all") {
      setLeads(prev => [lead, ...prev])
    }
  }

  const metaCount   = leads.filter(l => l.source === "meta_ad").length
  const manualCount = leads.filter(l => l.source === "manual").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            Meta Ads Ã‚Â· Manual entries Ã¢â‚¬â€ assign to your sales team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleTabChange(activeTab)}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2 gold-gradient font-semibold shadow-gold-sm"
            style={{ color: "var(--color-primary-foreground)" }}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total",        value: leads.length,                                    icon: Users,     color: "var(--color-primary)" },
          { label: "Unassigned",   value: leads.filter(l => l.status === "unassigned").length, icon: Clock, color: "var(--color-warning)" },
          { label: "From Meta",    value: metaCount,                                        icon: BarChart3, color: "var(--color-muted-foreground)" },
          { label: "Manual",       value: manualCount,                                      icon: PenLine,   color: "var(--color-primary)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead queue */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            Lead Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
                style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.24)" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Users className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                    No {activeTab !== "all" ? activeTab : ""} leads
                  </p>
                  {activeTab === "unassigned" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 mx-auto"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add your first lead manually
                    </Button>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="space-y-2">
                    {leads.map(lead => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        employees={employees}
                        assigningId={assigningId}
                        onAssign={handleAssign}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleLeadAdded}
      />
    </div>
  )
}
