// Helpers for cleaning up the raw values Meta puts in lead-form exports /
// webhooks (e.g. budget multiple-choice slugs like "inr_12cr_and_above_",
// phone numbers prefixed with "p:").

// Known Meta budget option slugs → human-readable labels. Extend as new
// options appear in your forms; anything not listed falls back to the
// generic prettifier below.
const BUDGET_VALUE_MAP: Record<string, string> = {
  inr_12cr_and_above: '12 Cr & Above',
}

/**
 * Turn a Meta budget answer into a readable label.
 *   "inr_12cr_and_above_"  -> "12 Cr & Above"
 *   "inr_1cr_to_2cr"       -> "1 Cr – 2 Cr"
 *   "below_50_lakh"        -> "Below 50 L"
 * Returns the input unchanged (trimmed) if it doesn't look like a slug.
 */
export function normalizeMetaBudget(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = String(raw).trim()
  if (trimmed === '') return null

  const key = trimmed.toLowerCase().replace(/^_+|_+$/g, '')
  if (BUDGET_VALUE_MAP[key]) return BUDGET_VALUE_MAP[key]

  // Not an underscore slug — leave human-entered values alone.
  if (!key.includes('_')) return trimmed

  let s = key
    .replace(/^(inr|rs|usd)[_\s]*/i, '') // drop currency prefix
    .replace(/_and_above/g, ' & above')
    .replace(/_and_below/g, ' & below')
    .replace(/_to_/g, ' – ')
    .replace(/_/g, ' ')
    .trim()

  // "12cr" -> "12 Cr", "50lakh"/"50l" -> "50 L"
  s = s
    .replace(/(\d+)\s*cr/gi, '$1 Cr')
    .replace(/(\d+)\s*(?:lakh|lac|l)\b/gi, '$1 L')

  // Title-case words, preserving the Cr/L tokens produced above.
  s = s.replace(/\b[a-z]/g, c => c.toUpperCase())

  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Extract just the phone number from a Meta value. Meta CSV exports prefix
 * the number with "p:" (e.g. "p:+916351656978"); strip it and any wrapping
 * whitespace. Does not otherwise reformat the number.
 */
export function stripPhonePrefix(raw: string): string {
  return raw.replace(/^\s*p:\s*/i, '').trim()
}

// Friendly campaign labels shown to sales execs. The raw Meta/Excel campaign
// name is matched (case-insensitive) against each rule's substrings — first
// match wins. Add a rule here to map a new campaign; unmatched campaign names
// pass through unchanged.
const CAMPAIGN_NAME_RULES: { match: string[]; label: string }[] = [
  { match: ['laarge apt', 'large apt'], label: 'Large Apartments' },
  { match: ['godrej'],                  label: 'Godrej' },
  { match: ['nn new leads'],            label: 'Nehru Nagar' },
  { match: ['bunglow', 'bungalow'],     label: 'Bungalows' },
]

/**
 * Map a raw campaign name to its friendly label, e.g.
 *   "laarge apts campaign 07/07/2024"      -> "Large Apartments"
 *   "bunglow Ahmedabad general - quality"  -> "Bungalows"
 *   "Godrej vastrapr - appartments"        -> "Godrej"
 *   "NN new leads campaign"                -> "Nehru Nagar"
 * Returns the original (trimmed) name when no rule matches.
 */
export function normalizeCampaignName(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = String(raw).trim()
  if (trimmed === '') return null

  const lc = trimmed.toLowerCase()
  for (const rule of CAMPAIGN_NAME_RULES) {
    if (rule.match.some(m => lc.includes(m))) return rule.label
  }
  return trimmed
}
