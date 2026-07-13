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
  return { source: 'calculated', items }
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse(fenced ?? content)
}

function cleanItems(value: unknown) {
  if (!value || typeof value !== 'object') return []
  const items = (value as { items?: unknown }).items
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
              content: 'You analyze sales employee metrics. Return strict JSON: {"items":["...","...","..."]}. Exactly 3 evidence-based insights, maximum 12 words each. No headings, praise, filler, or invented facts.',
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
      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = payload.choices?.[0]?.message?.content
      if (!content) return fallback
      const items = cleanItems(extractJson(content))
      return items.length === 3 ? { source: 'openrouter', items } : fallback
    } catch {
      return fallback
    }
  }
}
