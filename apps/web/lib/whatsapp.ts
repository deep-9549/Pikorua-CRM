/**
 * Client-side helpers for the per-lead "Send WhatsApp" button.
 *
 * Nothing here talks to WhatsApp. The button builds a deep link that opens
 * WhatsApp Web (or the phone's WhatsApp app) with the recipient and the message
 * pre-filled; the executive still presses send themselves, from whichever
 * number is logged into WhatsApp Web in that browser session.
 */

/** India, the only market the CRM currently sells in. */
const DEFAULT_COUNTRY_CODE = "91"

export interface TemplateContext {
  leadName?: string | null
  senderName?: string | null
  senderPhone?: string | null
}

/**
 * Normalises a stored phone number into the bare international digits WhatsApp
 * deep links expect (no `+`, no spaces). Returns null when the number cannot be
 * dialled, so callers can disable the button instead of opening a broken chat.
 *
 * Leads are imported from many sources, so the stored values range from bare
 * 10-digit mobiles through `+91 98765 43210` to numbers with a `0` trunk prefix.
 */
export function toWhatsappNumber(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "")
  if (!digits) return null

  // Bare 10-digit Indian mobile — the most common shape in imported data.
  if (digits.length === 10) {
    // Indian mobile numbers start 6-9. Anything else is a landline or junk and
    // will not have WhatsApp.
    if (!/^[6-9]/.test(digits)) return null
    return `${DEFAULT_COUNTRY_CODE}${digits}`
  }

  // Domestic trunk prefix, e.g. "09876543210".
  if (digits.length === 11 && digits.startsWith("0")) {
    return toWhatsappNumber(digits.slice(1))
  }

  // Already carries a country code.
  if (digits.length >= 11 && digits.length <= 15) return digits

  return null
}

/** True when this number can be opened as a WhatsApp chat. */
export function hasWhatsappNumber(raw: string | null | undefined): boolean {
  return toWhatsappNumber(raw) !== null
}

/**
 * Substitutes the supported placeholders into a saved template.
 *
 * Unknown placeholders are left untouched so a typo is visible in the preview
 * rather than silently disappearing from the message.
 */
export function renderWhatsappTemplate(template: string, context: TemplateContext): string {
  const firstName = (context.leadName ?? "").trim().split(/\s+/)[0] ?? ""

  const values: Record<string, string> = {
    lead_name: (context.leadName ?? "").trim() || "there",
    lead_first_name: firstName || "there",
    my_name: (context.senderName ?? "").trim(),
    my_phone: (context.senderPhone ?? "").trim(),
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  )
}

/** Placeholders offered in the template editor, with help text. */
export const WHATSAPP_PLACEHOLDERS = [
  { token: "{{lead_name}}", label: "Lead's full name" },
  { token: "{{lead_first_name}}", label: "Lead's first name" },
  { token: "{{my_name}}", label: "Your name" },
  { token: "{{my_phone}}", label: "Your phone number" },
] as const

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Builds the deep link for a chat.
 *
 * On desktop this targets `web.whatsapp.com` directly so the message lands in
 * the WhatsApp Web tab the executive is already signed into, rather than
 * bouncing through wa.me and possibly waking the desktop app. On phones wa.me
 * is correct — it hands off to the installed app.
 */
export function whatsappHref(
  phone: string | null | undefined,
  message: string,
): string | null {
  const number = toWhatsappNumber(phone)
  if (!number) return null

  const text = encodeURIComponent(message)
  return isMobileBrowser()
    ? `https://wa.me/${number}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${number}&text=${text}`
}
