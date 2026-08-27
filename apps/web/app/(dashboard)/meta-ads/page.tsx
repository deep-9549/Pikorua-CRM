"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, Users, Clock, UserPlus, RefreshCw, Phone, Mail,
  MapPin, Check, ChevronDown, Loader2, AlertCircle,
  Plus, PenLine, X, FileUp, Search, Undo2, ListChecks, CalendarDays, Shuffle, Trash2, MoreHorizontal
} from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { ImportLeadsDialog } from "@/components/import-leads-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAuthUser } from "@/lib/auth/cookies"
import {
  filterMetaAdsQueueLeads,
  matchingSelectedMetaAdsQueueLeadIds,
  metaAdsBudgetOptions,
  metaAdsQueueLeadIds,
} from "@/lib/meta-ads-queue-filter"
import type { MetaAdsQueueFilters } from "@/lib/meta-ads-queue-filter"

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  platform: "instagram" | "facebook" | null
  source: "meta_ad" | "website" | "microsite" | "manual" | "migrated" | "legacy_import"
  legacy_import: boolean
  status: "unassigned" | "assigned"
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string; role: string } | null
  client_status: string | null
  client_construction_business_owner?: boolean
  crm: {
    call_status: "spoken" | "not_spoken" | "call_back_later" | null
    budget_range?: string | null
  } | null
}

type MetaAdsTab = "unassigned" | "assigned" | "legacy-unassigned" | "legacy-assigned" | "all"

function queueStatusForTab(tab: MetaAdsTab): "assigned" | "unassigned" | undefined {
  if (tab === "assigned" || tab === "legacy-assigned") return "assigned"
  if (tab === "unassigned" || tab === "legacy-unassigned") return "unassigned"
  return undefined
}

interface Employee {
  id: string
  full_name: string
  phone: string | null
}

const CLIENT_STATUS_OPTIONS = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
  { value: "postponed", label: "Postponed" },
  { value: "lost", label: "Lost" },
  { value: "low_budget", label: "Low Budget" },
  { value: "not_interested", label: "Not Interested" },
  { value: "broker", label: "Broker" },
  { value: "construction_business_owner", label: "Construction Business Owner" },
]

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

async function readApiError(res: Response, fallback: string) {
  const json = await res.json().catch(() => null)
  const message = json?.message ?? json?.error

  if (Array.isArray(message)) return message.join(", ")
  if (typeof message === "string" && message.trim()) return message
  return fallback
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs" style={{ color: "var(--color-foreground)" }}>Email</Label>
              <Input
                type="email"
                placeholder="lead@example.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
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

            <div className="space-y-1.5 sm:col-span-2">
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

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:gap-3">
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
  unassigningId,
  onUnassign,
  canAssign = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  lead: MetaLead
  employees: Employee[]
  assigningId: string | null
  onAssign: (leadId: string, empId: string) => void
  unassigningId?: string | null
  onUnassign?: (leadId: string) => void
  canAssign?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (leadId: string) => void
}) {
  return (
    <motion.div
      key={lead.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors"
      style={{
        background: selected ? "rgb(194 65 12 / 0.06)" : "var(--color-card)",
        border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
      }}
    >
      {/* Selection checkbox */}
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect?.(lead.id)}
          className="shrink-0"
        />
      )}

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
          {lead.source === "website" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: "rgb(37 99 235 / 0.10)", color: "rgb(37 99 235)" }}>
              WEBSITE
            </span>
          )}
          {lead.source === "microsite" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: "rgb(20 184 166 / 0.10)", color: "rgb(15 118 110)" }}>
              MICROSITE
            </span>
          )}
          {lead.source === "meta_ad" && lead.platform && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: lead.platform === "instagram" ? "rgb(219 39 119 / 0.10)" : "rgb(37 99 235 / 0.10)",
                color: lead.platform === "instagram" ? "rgb(190 24 93)" : "rgb(37 99 235)",
              }}>
              {lead.platform === "instagram" ? "INSTAGRAM" : "FACEBOOK"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {lead.phone && (
            <ProtectedPhone value={lead.phone} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
              <Phone className="w-3 h-3" />{formatPhone(lead.phone)}
            </ProtectedPhone>
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
          {canAssign ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
              title="Unassign — return to queue"
              disabled={unassigningId === lead.id}
              onClick={() => onUnassign?.(lead.id)}
            >
              {unassigningId === lead.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Undo2 className="w-3.5 h-3.5" />}
            </Button>
          ) : (
            <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
          )}
        </div>
      ) : canAssign ? (
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
      ) : null}
    </motion.div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function SplitLeadsDialog({
  open,
  leadIds,
  employees,
  onClose,
  onSplit,
}: {
  open: boolean
  leadIds: string[]
  employees: Employee[]
  onClose: () => void
  onSplit: (leadIds: string[]) => void
}) {
  const [selectedExecutives, setSelectedExecutives] = useState<Set<string>>(new Set())
  const [splitting, setSplitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedExecutives(new Set())
      setError(null)
    }
  }, [open])

  const chosenEmployees = employees.filter(employee => selectedExecutives.has(employee.id))

  function toggleExecutive(employeeId: string) {
    setSelectedExecutives(current => {
      const next = new Set(current)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  async function handleSplit() {
    if (leadIds.length === 0 || chosenEmployees.length === 0) return
    setSplitting(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/meta/split-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids: leadIds,
          assigned_to_ids: chosenEmployees.map(employee => employee.id),
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Lead split failed"))
      onSplit(leadIds)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lead split failed")
    } finally {
      setSplitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && !splitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
            Split {leadIds.length} lead{leadIds.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Select the sales executives who should receive these leads. The difference between their allocations will never be more than one lead.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {employees.length === 0 ? (
            <div className="rounded-lg border px-4 py-6 text-center text-sm" style={{ color: "var(--color-muted-foreground)" }}>
              No active sales executives are available.
            </div>
          ) : employees.map(employee => {
            const isSelected = selectedExecutives.has(employee.id)
            const chosenIndex = chosenEmployees.findIndex(chosen => chosen.id === employee.id)
            const allocation = chosenIndex < 0
              ? 0
              : Math.floor(leadIds.length / chosenEmployees.length)
                + (chosenIndex < leadIds.length % chosenEmployees.length ? 1 : 0)

            return (
              <div
                key={employee.id}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
                style={{ borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)" }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleExecutive(employee.id)}
                  aria-label={`Select ${employee.full_name}`}
                />
                <button
                  type="button"
                  onClick={() => toggleExecutive(employee.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">{initials(employee.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{employee.full_name}</span>
                  {isSelected && (
                    <Badge variant="secondary" className="shrink-0">
                      {allocation} lead{allocation === 1 ? "" : "s"}
                    </Badge>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {chosenEmployees.length > 0 && (
          <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
            {leadIds.length} lead{leadIds.length === 1 ? "" : "s"} will be split between {chosenEmployees.length} executive{chosenEmployees.length === 1 ? "" : "s"}.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
            style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.24)" }}>
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={splitting}>Cancel</Button>
          <Button
            className="gap-2 gold-gradient font-semibold shadow-gold-sm"
            style={{ color: "var(--color-primary-foreground)" }}
            disabled={splitting || chosenEmployees.length === 0 || leadIds.length === 0}
            onClick={handleSplit}
          >
            {splitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            {splitting ? "Splitting..." : "Split and assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function MetaAdsPage() {
  const [leads, setLeads] = useState<MetaLead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [unassigningId, setUnassigningId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MetaAdsTab>("unassigned")
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkExec, setBulkExec] = useState("")
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [bulkUnassigning, setBulkUnassigning] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [platformFilter, setPlatformFilter] = useState("")
  const [campaignFilter, setCampaignFilter] = useState("")
  const [budgetFilter, setBudgetFilter] = useState("")
  const [executiveFilter, setExecutiveFilter] = useState("")
  const [clientStatusFilter, setClientStatusFilter] = useState("")
  const [callStatusFilter, setCallStatusFilter] = useState("")
  const [receivedDateFromFilter, setReceivedDateFromFilter] = useState("")
  const [receivedDateToFilter, setReceivedDateToFilter] = useState("")
  const isUnassignedTab = activeTab === "unassigned" || activeTab === "legacy-unassigned"
  const isAssignedTab = activeTab === "assigned" || activeTab === "legacy-assigned"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("quickAdd") === "lead") {
      setAddOpen(true)
    }
  }, [])

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

  function toggleSelect(leadId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  async function handleBulkAssign() {
    if (!isSuperAdmin) return
    if (!bulkExec || selectedShownLeadIds.length === 0) return
    setBulkAssigning(true)
    try {
      const selectedIds = selectedShownLeadIds
      const res = await fetch("/api/leads/meta/assign-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: selectedIds, assigned_to: bulkExec }),
      })
      if (!res.ok) {
        throw new Error(await readApiError(res, "Bulk assignment failed"))
      }
      // Selected leads leave the current (unassigned / cold pool) view
      const selectedSet = new Set(selectedIds)
      setLeads(prev => prev.filter(l => !selectedSet.has(l.id)))
      setSelected(new Set())
      setBulkExec("")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Bulk assignment failed")
    } finally {
      setBulkAssigning(false)
    }
  }

  async function handleBulkUnassign() {
    if (!isSuperAdmin || !isAssignedTab || selectedShownLeadIds.length === 0) return
    setBulkUnassigning(true)
    try {
      const selectedIds = selectedShownLeadIds
      const res = await fetch("/api/leads/meta/bulk-unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: selectedIds }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Bulk unassign failed"))
      const selectedSet = new Set(selectedIds)
      setLeads(current => current.filter(lead => !selectedSet.has(lead.id)))
      setSelected(new Set())
    } catch (e) {
      alert(e instanceof Error ? e.message : "Bulk unassign failed")
    } finally {
      setBulkUnassigning(false)
    }
  }

  async function handleBulkDelete() {
    if (!isSuperAdmin || !isUnassignedTab || selectedShownLeadIds.length === 0) return
    setBulkDeleting(true)
    try {
      const selectedIds = selectedShownLeadIds
      const res = await fetch("/api/leads/meta/delete-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: selectedIds }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Bulk delete failed"))
      const selectedSet = new Set(selectedIds)
      setLeads(current => current.filter(lead => !selectedSet.has(lead.id)))
      setSelected(new Set())
      setDeleteConfirmOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Bulk delete failed")
    } finally {
      setBulkDeleting(false)
    }
  }

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        const authUser = getAuthUser()
        const canViewEmployees = authUser?.role === "super_admin"
        setIsSuperAdmin(canViewEmployees)

        const [leadsRes, empsRes] = await Promise.all([
          fetch("/api/leads/meta?status=unassigned"),
          canViewEmployees ? fetch("/api/employees") : Promise.resolve(null),
        ])
        const leadsJson = await leadsRes.json()
        const empsJson = empsRes ? await empsRes.json() : { employees: [] }
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
    if (!isSuperAdmin) return
    setAssigningId(leadId)
    try {
      const res = await fetch(`/api/leads/meta/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: employeeId }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Assignment failed"))
      setLeads(prev => prev.filter(l => l.id !== leadId))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assignment failed")
    } finally {
      setAssigningId(null)
    }
  }

  async function handleUnassign(leadId: string) {
    if (!isSuperAdmin) return
    setUnassigningId(leadId)
    try {
      const res = await fetch(`/api/leads/meta/${leadId}/unassign`, { method: "POST" })
      if (!res.ok) throw new Error(await readApiError(res, "Unassign failed"))
      // On the "assigned" tab the lead leaves the view; elsewhere flip it back
      // to unassigned in place.
      setLeads(prev => isAssignedTab
        ? prev.filter(l => l.id !== leadId)
        : prev.map(l => l.id === leadId
            ? { ...l, status: "unassigned", assigned_to_profile: null, assigned_at: null }
            : l))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unassign failed")
    } finally {
      setUnassigningId(null)
    }
  }

  function handleTabChange(tab: string) {
    const nextTab = tab as MetaAdsTab
    setActiveTab(nextTab)
    setSelected(new Set())
    setExecutiveFilter("")
    setClientStatusFilter("")
    setCallStatusFilter("")
    fetchLeads(queueStatusForTab(nextTab))
  }

  function handleLeadAdded(lead: MetaLead) {
    // Manual leads can be unassigned or assigned to the creator; only add them
    // when they belong in the current tab.
    if (activeTab === "all" || (!lead.legacy_import && lead.status === activeTab)) {
      setLeads(prev => [lead, ...prev])
    }
  }

  const metaCount   = leads.filter(l => l.source === "meta_ad").length
  const websiteCount = leads.filter(l => l.source === "website").length
  const micrositeCount = leads.filter(l => l.source === "microsite").length
  const manualCount = leads.filter(l => l.source === "manual").length
  const instagramCount = leads.filter(l => l.platform === "instagram").length
  const facebookCount = leads.filter(l => l.platform === "facebook").length
  // Bulk select is available where leads await assignment
  const selectable = isSuperAdmin && (isUnassignedTab || isAssignedTab)

  // Distinct campaign names present in the current queue (for the filter)
  const campaigns = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => { if (l.campaign_name) set.add(l.campaign_name) })
    return Array.from(set).sort()
  }, [leads])
  const budgets = useMemo(() => metaAdsBudgetOptions(leads), [leads])

  const queueFilters = useMemo<MetaAdsQueueFilters>(() => ({
    search,
    source: sourceFilter,
    platform: platformFilter,
    campaign: campaignFilter,
    budget: budgetFilter,
    executive: executiveFilter,
    clientStatus: clientStatusFilter,
    callStatus: callStatusFilter,
    receivedDateFrom: receivedDateFromFilter,
    receivedDateTo: receivedDateToFilter,
    queueStatus: queueStatusForTab(activeTab) ?? "",
    legacyMode: activeTab.startsWith("legacy-") ? "only" : activeTab === "all" ? "all" : "exclude",
  }), [activeTab, search, sourceFilter, platformFilter, campaignFilter, budgetFilter, executiveFilter, clientStatusFilter, callStatusFilter, receivedDateFromFilter, receivedDateToFilter])

  // Apply search + filters to the loaded queue through a pure, regression-tested helper.
  const filteredLeads = useMemo(
    () => filterMetaAdsQueueLeads(leads, queueFilters),
    [leads, queueFilters],
  )

  const hasActiveFilter = Boolean(search || sourceFilter || platformFilter || campaignFilter || budgetFilter || executiveFilter || clientStatusFilter || callStatusFilter || receivedDateFromFilter || receivedDateToFilter)
  const shownLeadIds = metaAdsQueueLeadIds(filteredLeads)
  const selectedShownLeadIds = matchingSelectedMetaAdsQueueLeadIds(filteredLeads, selected)
  const splitLeadIds = selectedShownLeadIds.length > 0 ? selectedShownLeadIds : shownLeadIds
  const shownSelectionOnly = shownLeadIds.length > 0
    && selectedShownLeadIds.length === shownLeadIds.length
    && shownLeadIds.every(id => selected.has(id))

  function clearFilters() {
    setSearch("")
    setSourceFilter("")
    setPlatformFilter("")
    setCampaignFilter("")
    setBudgetFilter("")
    setExecutiveFilter("")
    setClientStatusFilter("")
    setCallStatusFilter("")
    setReceivedDateFromFilter("")
    setReceivedDateToFilter("")
  }

  function selectShownLeads() {
    if (!selectable) return
    setSelected(new Set(shownLeadIds))
  }

  function handleSplitComplete(leadIds: string[]) {
    const splitIds = new Set(leadIds)
    setLeads(current => current.filter(lead => !splitIds.has(lead.id)))
    setSelected(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            Meta Ads - Website enquiries - Manual entries - assign to your sales team
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="w-4 h-4" />
              Import Excel
            </Button>
          )}
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total",        value: leads.length,                                    icon: Users,     color: "var(--color-primary)" },
          { label: "Unassigned",   value: leads.filter(l => l.status === "unassigned").length, icon: Clock, color: "var(--color-warning)" },
          { label: "From Meta",    value: metaCount,                                        icon: BarChart3, color: "var(--color-muted-foreground)" },
          { label: "Website",      value: websiteCount,                                     icon: Users,     color: "rgb(37 99 235)" },
          { label: "Microsite",    value: micrositeCount,                                   icon: Users,     color: "rgb(15 118 110)" },
          { label: "Manual",       value: manualCount,                                      icon: PenLine,   color: "var(--color-primary)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              {label === "From Meta" ? (
                <div className="flex items-end justify-between gap-2">
                  <p className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{value}</p>
                  <div className="grid grid-cols-2 divide-x rounded-md border" style={{ borderColor: "var(--color-border)" }}>
                    <button
                      type="button"
                      className="min-w-10 px-2 py-0.5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => {
                        setSourceFilter("meta_ad")
                        setPlatformFilter(current => current === "instagram" ? "" : "instagram")
                      }}
                      aria-pressed={platformFilter === "instagram"}
                    >
                      <span className="block text-[9px] font-semibold uppercase" style={{ color: "rgb(190 24 93)" }}>IG</span>
                      <span className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>{instagramCount}</span>
                    </button>
                    <button
                      type="button"
                      className="min-w-10 px-2 py-0.5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => {
                        setSourceFilter("meta_ad")
                        setPlatformFilter(current => current === "facebook" ? "" : "facebook")
                      }}
                      aria-pressed={platformFilter === "facebook"}
                    >
                      <span className="block text-[9px] font-semibold uppercase" style={{ color: "rgb(37 99 235)" }}>FB</span>
                      <span className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>{facebookCount}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{value}</p>
              )}
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
            <TabsList className="mb-4 h-auto flex-wrap justify-start">
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="legacy-unassigned">Legacy Unassigned</TabsTrigger>
              <TabsTrigger value="legacy-assigned">Legacy Assigned</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {/* Search + filters */}
            <div className="flex flex-col gap-2 mb-4 xl:flex-row xl:flex-wrap">
              <div className="relative min-w-0 w-full xl:min-w-[280px] xl:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
                <Input
                  placeholder="Search by name, phone, email, city, campaign..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 w-full pl-9"
                />
              </div>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-9 rounded-lg px-2.5 text-xs bg-transparent cursor-pointer"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
              >
                <option value="">All Sources</option>
                <option value="meta_ad">Meta Ad</option>
                <option value="website">Website</option>
                <option value="microsite">Microsite</option>
                <option value="manual">Manual</option>
                <option value="migrated">Migrated</option>
                <option value="legacy_import">Legacy import</option>
              </select>
              <select
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
                className="h-9 rounded-lg px-2.5 text-xs bg-transparent cursor-pointer"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
              >
                <option value="">All Platforms</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>
              {campaigns.length > 0 && (
                <select
                  value={campaignFilter}
                  onChange={e => setCampaignFilter(e.target.value)}
                  className="h-9 w-full rounded-lg px-2.5 text-xs bg-transparent cursor-pointer sm:max-w-[200px]"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {budgets.length > 0 && (
                <select
                  value={budgetFilter}
                  onChange={e => setBudgetFilter(e.target.value)}
                  aria-label="Filter by budget"
                  className="h-9 w-full rounded-lg px-2.5 text-xs bg-transparent cursor-pointer sm:max-w-[160px]"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <option value="">All Budgets</option>
                  {budgets.map(budget => <option key={budget} value={budget}>{budget}</option>)}
                </select>
              )}
              {isSuperAdmin && !isUnassignedTab && (
                <select
                  value={executiveFilter}
                  onChange={e => setExecutiveFilter(e.target.value)}
                  aria-label="Filter by sales executive"
                  className="h-9 w-full rounded-lg px-2.5 text-xs bg-transparent cursor-pointer sm:max-w-[200px]"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <option value="">All Sales Executives</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                  ))}
                </select>
              )}
              {isAssignedTab && (
                <select
                  value={clientStatusFilter}
                  onChange={e => setClientStatusFilter(e.target.value)}
                  aria-label="Filter by client status"
                  className="h-9 w-full rounded-lg px-2.5 text-xs bg-transparent cursor-pointer sm:max-w-[180px]"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <option value="">All Client Statuses</option>
                  {CLIENT_STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              )}
              {isAssignedTab && (
                <select
                  value={callStatusFilter}
                  onChange={e => setCallStatusFilter(e.target.value)}
                  aria-label="Filter by call status"
                  className="h-9 w-full rounded-lg px-2.5 text-xs bg-transparent cursor-pointer sm:max-w-[160px]"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                >
                  <option value="">All Call Statuses</option>
                  <option value="spoken">Spoken</option>
                  <option value="not_spoken">Not Spoken</option>
                </select>
              )}
              {isSuperAdmin && (
                <div className="flex w-full items-center gap-1.5 sm:w-auto">
                  <div className="relative min-w-0 flex-1 sm:flex-none">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
                    <Input
                      type="date"
                      aria-label="Lead received start date"
                      value={receivedDateFromFilter}
                      max={receivedDateToFilter || undefined}
                      onChange={e => setReceivedDateFromFilter(e.target.value)}
                      className="h-9 pl-9 text-xs sm:w-[150px]"
                    />
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>to</span>
                  <Input
                    type="date"
                    aria-label="Lead received end date"
                    value={receivedDateToFilter}
                    min={receivedDateFromFilter || undefined}
                    onChange={e => setReceivedDateToFilter(e.target.value)}
                    className="h-9 min-w-0 flex-1 text-xs sm:w-[150px] sm:flex-none"
                  />
                </div>
              )}
              {selectable && filteredLeads.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 text-xs shrink-0"
                    disabled={shownSelectionOnly}
                    onClick={selectShownLeads}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Select shown
                  </Button>
                  {isUnassignedTab && (
                    <Button
                      size="sm"
                      className="gap-1.5 h-9 text-xs shrink-0 gold-gradient font-semibold shadow-gold-sm"
                      style={{ color: "var(--color-primary-foreground)" }}
                      onClick={() => setSplitOpen(true)}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      {selectedShownLeadIds.length > 0 ? `Split selected (${selectedShownLeadIds.length})` : `Split shown (${shownLeadIds.length})`}
                    </Button>
                  )}
                </>
              )}
              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-9 text-xs shrink-0"
                  onClick={clearFilters}
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
                style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.24)" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            {/* Bulk assign bar — shown on selectable tabs when rows are checked */}
            {selectable && selectedShownLeadIds.length > 0 && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2.5"
                style={{ background: "rgb(194 65 12 / 0.08)", border: "1px solid var(--color-primary)" }}>
                <div className="flex w-full items-center justify-between sm:w-auto">
                  <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                    {selectedShownLeadIds.length} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:hidden"
                    aria-label="Clear selected leads"
                    onClick={() => setSelected(new Set())}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="hidden flex-1 sm:block" />
                {isUnassignedTab ? (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <select
                      value={bulkExec}
                      onChange={e => setBulkExec(e.target.value)}
                      aria-label="Executive to assign selected leads to"
                      className="h-10 w-full rounded-lg bg-card px-3 text-sm cursor-pointer sm:h-9 sm:w-[210px] sm:text-xs"
                      style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                    >
                      <option value="">Choose executive...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-10 w-full gap-1.5 gold-gradient px-5 text-sm font-semibold shadow-gold-sm sm:h-9 sm:w-auto sm:text-xs"
                      style={{ color: "var(--color-primary-foreground)" }}
                      disabled={!bulkExec || bulkAssigning || bulkDeleting}
                      onClick={handleBulkAssign}
                    >
                      {bulkAssigning
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <><UserPlus className="w-3.5 h-3.5" />Assign {selectedShownLeadIds.length}</>}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-full shrink-0 gap-2 sm:h-9 sm:w-9"
                          aria-label="More actions for selected leads"
                          disabled={bulkAssigning || bulkDeleting}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sm:sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onSelect={() => setDeleteConfirmOpen(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete selected leads
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-1.5 text-xs font-semibold sm:h-9 sm:w-auto"
                    disabled={bulkUnassigning}
                    onClick={handleBulkUnassign}
                  >
                    {bulkUnassigning
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><Undo2 className="w-3.5 h-3.5" />Unassign {selectedShownLeadIds.length}</>}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-9 w-9 sm:inline-flex"
                  aria-label="Clear selected leads"
                  onClick={() => setSelected(new Set())}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  {hasActiveFilter ? (
                    <>
                      <Search className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                        No leads match your search or filters
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 mx-auto"
                        onClick={clearFilters}
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <Users className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                        {`No ${activeTab !== "all" ? activeTab : ""} leads`}
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
                    </>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="space-y-2">
                    {filteredLeads.map(lead => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        employees={employees}
                        assigningId={assigningId}
                        onAssign={handleAssign}
                        unassigningId={unassigningId}
                        onUnassign={handleUnassign}
                        canAssign={isSuperAdmin}
                        selectable={selectable}
                        selected={selected.has(lead.id)}
                        onToggleSelect={toggleSelect}
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

      {/* Import Leads Dialog */}
      <ImportLeadsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchLeads(queueStatusForTab(activeTab))}
      />

      <SplitLeadsDialog
        open={splitOpen}
        leadIds={splitLeadIds}
        employees={employees}
        onClose={() => setSplitOpen(false)}
        onSplit={handleSplitComplete}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={open => !bulkDeleting && setDeleteConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedShownLeadIds.length} unassigned lead{selectedShownLeadIds.length === 1 ? "" : "s"} permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected leads and their related CRM history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
              onClick={event => { event.preventDefault(); handleBulkDelete() }}
            >
              {bulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {bulkDeleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
