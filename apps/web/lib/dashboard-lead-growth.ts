const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export type ComparableLeadGrowth = {
  currentCount: number
  previousCount: number
  previousCutoffDay: number
  percentChange: number | null
}

function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function istStartUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS)
}

export function comparableMonthRanges(now: Date) {
  const current = istParts(now)
  const currentMonthDays = daysInMonth(current.year, current.month)
  const previousMonthDate = new Date(Date.UTC(current.year, current.month - 1, 1))
  const previousYear = previousMonthDate.getUTCFullYear()
  const previousMonth = previousMonthDate.getUTCMonth()
  const previousMonthDays = daysInMonth(previousYear, previousMonth)
  const previousCutoffDay = Math.ceil((current.day / currentMonthDays) * previousMonthDays)

  return {
    currentStart: istStartUtc(current.year, current.month, 1),
    currentEnd: istStartUtc(current.year, current.month, current.day + 1),
    previousStart: istStartUtc(previousYear, previousMonth, 1),
    previousEnd: istStartUtc(previousYear, previousMonth, previousCutoffDay + 1),
    previousCutoffDay,
  }
}

export function calculateComparableLeadGrowth(receivedDates: Array<string | null | undefined>, now: Date): ComparableLeadGrowth {
  const ranges = comparableMonthRanges(now)
  let currentCount = 0
  let previousCount = 0

  for (const value of receivedDates) {
    if (!value) continue
    const received = new Date(value)
    if (Number.isNaN(received.getTime())) continue
    if (received >= ranges.currentStart && received < ranges.currentEnd) currentCount += 1
    if (received >= ranges.previousStart && received < ranges.previousEnd) previousCount += 1
  }

  return {
    currentCount,
    previousCount,
    previousCutoffDay: ranges.previousCutoffDay,
    percentChange: previousCount === 0
      ? null
      : ((currentCount - previousCount) / previousCount) * 100,
  }
}

export function comparableLeadGrowthLabel(growth: ComparableLeadGrowth) {
  if (growth.previousCount === 0) {
    return growth.currentCount > 0
      ? 'New vs 0 in the comparable period last month'
      : 'No leads in either comparable period'
  }
  const rounded = Math.round(Math.abs(growth.percentChange ?? 0))
  if (rounded === 0) return 'No change from the comparable period last month'
  return `${rounded}% ${growth.currentCount > growth.previousCount ? 'more' : 'less'} than the comparable period last month`
}
