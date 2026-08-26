export const BUDGET_BUCKETS = [
  ...Array.from({ length: 20 }, (_, index) => `${index + 1} Cr`),
  '21 Cr+',
] as const

type BudgetInterval = { min: number; max: number }

function parseAmount(value: string, unit: string | undefined) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return unit && /^(l|lakhs?|lac)$/i.test(unit) ? number / 100 : number
}

export function parseBudgetInterval(raw: string | null | undefined): BudgetInterval | null {
  if (!raw?.trim()) return null
  const normalized = raw.toLowerCase()
    .replace(/[₹,]/g, ' ')
    .replace(/crores?/g, 'cr')
    .replace(/[–—]/g, '-')
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(cr|lakh|lakhs|lac|l)?/g)]
    .map(match => parseAmount(match[1], match[2]))
    .filter((value): value is number => value !== null)
  if (!matches.length) return null
  if (/\+|and\s+above|above|or\s+more/.test(normalized)) return { min: matches[0], max: Infinity }
  if (matches.length === 1) return { min: matches[0], max: matches[0] }
  return { min: Math.min(matches[0], matches[1]), max: Math.max(matches[0], matches[1]) }
}

export function budgetMatchesBucket(raw: string | null | undefined, bucket: string) {
  const interval = parseBudgetInterval(raw)
  if (!interval) return false
  const bucketMin = bucket === '21 Cr+' ? 21 : Number(bucket.replace(' Cr', ''))
  const bucketMax = bucket === '21 Cr+' ? Infinity : bucketMin
  return interval.min <= bucketMax && interval.max >= bucketMin
}
