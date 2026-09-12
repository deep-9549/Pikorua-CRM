"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Check, Loader2, MessageCircle, RotateCcw, Save, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { renderWhatsappTemplate, WHATSAPP_PLACEHOLDERS } from "@/lib/whatsapp"
import {
  publishWhatsappTemplate, type WhatsappTemplate,
} from "@/lib/whatsapp-template-store"

interface FeedbackState {
  type: "success" | "error"
  message: string
}

/** Stand-in lead used by the preview so placeholders render as real text. */
const PREVIEW_LEAD_NAME = "Rahul Sharma"

function apiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback
  const value = (payload as { message?: string | string[] }).message
    ?? (payload as { error?: string }).error
  return Array.isArray(value) ? value[0] : value || fallback
}

export default function WhatsappMessagePage() {
  const [saved, setSaved] = React.useState<WhatsappTemplate | null>(null)
  const [draft, setDraft] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [feedback, setFeedback] = React.useState<FeedbackState | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    let active = true
    fetch("/api/auth/whatsapp-template", { cache: "no-store" })
      .then(async response => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(apiError(payload, "Could not load your message"))
        return payload as WhatsappTemplate
      })
      .then(result => {
        if (!active) return
        setSaved(result)
        setDraft(result.template)
      })
      .catch((error: Error) => {
        if (active) setFeedback({ type: "error", message: error.message })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const dirty = saved !== null && draft !== saved.template

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/auth/whatsapp-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: draft }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiError(payload, "Could not save your message"))

      const result = payload as WhatsappTemplate
      setSaved(result)
      setDraft(result.template)
      // Refresh the copy every open lead list is holding.
      publishWhatsappTemplate(result)
      setFeedback({ type: "success", message: "Saved. New leads you message will use this text." })
    } catch (error) {
      setFeedback({ type: "error", message: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  /** Saving an empty template asks the server for the default text back. */
  async function handleReset() {
    setDraft("")
    setFeedback(null)
    textareaRef.current?.focus()
  }

  function insertPlaceholder(token: string) {
    const textarea = textareaRef.current
    if (!textarea) {
      setDraft(current => current + token)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    setDraft(current => current.slice(0, start) + token + current.slice(end))
    // Restore the caret after React has written the new value.
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const preview = React.useMemo(
    () => renderWhatsappTemplate(draft, {
      leadName: PREVIEW_LEAD_NAME,
      senderName: saved?.sender_name,
      senderPhone: saved?.sender_phone,
    }),
    [draft, saved?.sender_name, saved?.sender_phone],
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
          <MessageCircle className="h-5 w-5" style={{ color: "oklch(0.62 0.17 150)" }} />
          WhatsApp Message
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write your thank-you message once. The WhatsApp button on every lead opens
          WhatsApp Web with this text already filled in — you still press send.
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-600/20 bg-emerald-600/8 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/20 bg-destructive/8 text-destructive",
          )}
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Your message</CardTitle>
                  <CardDescription>Used for every lead you message.</CardDescription>
                </div>
                {saved?.is_default && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">Default</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={event => setDraft(event.target.value)}
                rows={16}
                maxLength={2000}
                placeholder="Leave empty to go back to the default message."
                className="resize-y font-normal leading-relaxed"
              />

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{draft.length} / 2000 characters</span>
                {dirty && <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Insert a placeholder</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WHATSAPP_PLACEHOLDERS.map(placeholder => (
                    <Button
                      key={placeholder.token}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[11px]"
                      onClick={() => insertPlaceholder(placeholder.token)}
                      title={placeholder.label}
                    >
                      <Sparkles className="h-3 w-3" />
                      {placeholder.token}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save message
                </Button>
                <Button variant="ghost" onClick={handleReset} disabled={saving} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" />
                  Reset to default
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                How it arrives for a lead named {PREVIEW_LEAD_NAME}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-xl px-3.5 py-3"
                style={{ background: "oklch(0.62 0.17 150 / 0.10)", border: "1px solid oklch(0.62 0.17 150 / 0.25)" }}
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                  style={{ color: "var(--color-foreground)" }}>
                  {preview || "Your message will appear here."}
                </p>
              </div>

              {(!saved?.sender_name || !saved?.sender_phone) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {!saved?.sender_name && "Your name "}
                  {!saved?.sender_name && !saved?.sender_phone && "and "}
                  {!saved?.sender_phone && "your phone number "}
                  {!saved?.sender_name && !saved?.sender_phone ? "are" : "is"} missing from your
                  profile, so that placeholder renders blank. Add it in Settings → My account.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
