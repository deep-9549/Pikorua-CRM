"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AlertCircle, Loader2, PenLine, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AddedLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  status: string
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string; role?: string } | null
}

async function readApiError(res: Response, fallback: string) {
  const json = await res.json().catch(() => null)
  const message = json?.message ?? json?.error

  if (Array.isArray(message)) return message.join(", ")
  if (typeof message === "string" && message.trim()) return message
  return fallback
}

export function AddLeadDialog<TLead = AddedLead>({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (lead: TLead) => void
}) {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", city: "", campaign_name: "", notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({ full_name: "", phone: "", email: "", city: "", campaign_name: "", notes: "" })
      setError(null)
    }
  }, [open])

  function set(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await readApiError(res, "Failed to add lead"))
      const json = await res.json()
      onAdded(json.lead as TLead)
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
