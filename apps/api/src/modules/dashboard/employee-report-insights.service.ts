import { Injectable } from '@nestjs/common'

export interface EmployeeReportInsightInput {
  employee: string
  range: { startDate: string; endDate: string }
  summary: Record<string, number>
  previousSummary: Record<string, number>
  ratios: Record<string, number>
}

export interface EmployeeReportInsights {
  source: 'openrouter' | 'calculated'
  items: string[]
  actions: string[]
}

function calculatedInsights(input: EmployeeReportInsightInput): EmployeeReportInsights {
  const { summary, previousSummary, ratios } = input
  const conversionDelta = Number(summary.conversionRate) - Number(previousSummary.conversionRate)
  const leadDelta = Number(summary.totalLeads) - Number(previousSummary.totalLeads)
  const items = [
    `${leadDelta >= 0 ? 'Lead volume gained' : 'Lead volume fell'} ${Math.abs(leadDelta)} vs prior period.`,
    `Contact rate is ${Number(ratios.contactRate).toFixed(1)}%; conversion is ${Number(ratios.conversionRate).toFixed(1)}%.`,
    conversionDelta >= 0
      ? `Conversion improved ${conversionDelta.toFixed(1)} percentage points.`
      : `Conversion needs attention: down ${Math.abs(conversionDelta).toFixed(1)} points.`,
  ]
  const actions = [
    Number(ratios.contactRate) < 60
      ? 'Review unspoken calls daily and retry the strongest leads first.'
      : 'Maintain contact quality with focused follow-ups on spoken leads.',
    Number(ratios.visitCompletionRate) < 70
      ? 'Confirm site visits one day before and again two hours prior.'
      : 'Convert completed visits faster with same-day proposal follow-ups.',
    Number(ratios.callsPerLead) < 1.5
      ? 'Increase call consistency until every assigned lead receives follow-up.'
      : 'Prioritize high-intent leads to improve calls-to-conversion efficiency.',
  ]
  return { source: 'calculated', items, actions }
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse(fenced ?? content)
}

function cleanList(value: unknown, key: 'items' | 'actions') {
  if (!value || typeof value !== 'object') return []
  const items = (value as Record<string, unknown>)[key]
  if (!Array.isArray(items)) return []
  return items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim().slice(0, 110))
    .filter(Boolean)
    .slice(0, 3)
}

@Injectable()
export class EmployeeReportInsightsService {
  async analyze(input: EmployeeReportInsightInput): Promise<EmployeeReportInsights> {
    const fallback = calculatedInsights(input)
    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) return fallback

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://crm.pikorua.in',
          'X-Title': 'Pikorua CRM Employee Reports',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
          temperature: 0.15,
          max_tokens: 180,
          messages: [
            {
              role: 'system',
              content: 'You analyze sales employee metrics. Return strict JSON: {"items":["...","...","..."],"actions":["...","...","..."]}. Give exactly 3 evidence-based insights and exactly 3 practical improvement actions. Maximum 12 words each. Actions must start with a verb. No headings, praise, filler, or invented facts.',
            },
            {
              role: 'user',
              content: JSON.stringify(input),
            },
          ],
        }),
        signal: AbortSignal.timeout(8_000),
      })

      if (!response.ok) return fallback
      const payload = await response.json().catch(() => null) as {
        choices?: Array<{ message?: { content?: string } }>
      } | null
      const content = payload?.choices?.[0]?.message?.content
      if (!content) return fallback
      const parsed = extractJson(content)
      const items = cleanList(parsed, 'items')
      const actions = cleanList(parsed, 'actions')
      return items.length === 3 && actions.length === 3
        ? { source: 'openrouter', items, actions }
        : fallback
    } catch {
      return fallback
    }
  }
}
