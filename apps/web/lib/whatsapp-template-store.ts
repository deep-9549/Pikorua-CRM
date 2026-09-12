"use client"

import * as React from "react"

export interface WhatsappTemplate {
  template: string
  is_default: boolean
  sender_name: string | null
  sender_phone: string | null
}

const TEMPLATE_UPDATED_EVENT = "pikorua:whatsapp-template-updated"

/**
 * The template is identical for every row in a lead list, so it is fetched once
 * per session and shared. Without this, a 200-row list would fire 200 identical
 * requests as the buttons mount.
 */
let cached: WhatsappTemplate | null = null
let inFlight: Promise<WhatsappTemplate | null> | null = null

async function fetchTemplate(): Promise<WhatsappTemplate | null> {
  const response = await fetch("/api/auth/whatsapp-template", { cache: "no-store" })
  if (!response.ok) return null
  return (await response.json()) as WhatsappTemplate
}

export function loadWhatsappTemplate(): Promise<WhatsappTemplate | null> {
  if (cached) return Promise.resolve(cached)
  if (!inFlight) {
    inFlight = fetchTemplate()
      .then(result => {
        if (result) cached = result
        return result
      })
      .catch(() => null)
      // Clearing this lets a failed load be retried by the next mount rather
      // than sticking a rejected promise in front of every button.
      .finally(() => { inFlight = null })
  }
  return inFlight
}

/** Called by the editor after a save so open lead lists pick up the new text. */
export function publishWhatsappTemplate(next: WhatsappTemplate) {
  cached = next
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TEMPLATE_UPDATED_EVENT))
  }
}

export function useWhatsappTemplate() {
  const [template, setTemplate] = React.useState<WhatsappTemplate | null>(cached)

  React.useEffect(() => {
    let active = true

    const sync = () => {
      loadWhatsappTemplate().then(result => {
        if (active && result) setTemplate(result)
      })
    }

    sync()
    const onUpdate = () => { if (active) setTemplate(cached) }
    window.addEventListener(TEMPLATE_UPDATED_EVENT, onUpdate)
    return () => {
      active = false
      window.removeEventListener(TEMPLATE_UPDATED_EVENT, onUpdate)
    }
  }, [])

  return template
}
