import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a stored phone number (usually bare digits like "916351656978")
 * for display, e.g. "+91 63516 56978". Defaults to India (+91) for 10-digit
 * numbers. Unrecognised formats are returned trimmed but otherwise untouched.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ""
  const digits = String(raw).replace(/\D/g, "")
  if (!digits) return String(raw).trim()

  const groupTen = (n: string) => `${n.slice(0, 5)} ${n.slice(5)}`

  // Plain 10-digit Indian mobile
  if (digits.length === 10) return `+91 ${groupTen(digits)}`
  // 91 + 10 digits
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${groupTen(digits.slice(2))}`
  // Some other country code + 10-digit subscriber number
  if (digits.length > 10) {
    const cc = digits.slice(0, digits.length - 10)
    return `+${cc} ${groupTen(digits.slice(-10))}`
  }
  // Shorter/odd numbers — leave as-is
  return String(raw).trim()
}

/** Dialable href form for a stored phone number, e.g. "tel:+916351656978". */
export function phoneHref(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "")
  return `tel:${digits.length > 10 ? "+" : ""}${digits}`
}
