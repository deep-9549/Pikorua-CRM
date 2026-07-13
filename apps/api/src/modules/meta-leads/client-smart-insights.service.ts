import { Injectable, Logger } from '@nestjs/common'

type SmartInsightInput = {
  client?: Record<string, unknown>
  preferences?: Record<string, unknown>
  history?: Array<Record<string, unknown>>
  recommendations?: Array<Record<string, unknown>>
}

type ProjectStrategy = {
  property_id: string
  project_name: string
  priority: number
  why_now: string
  pitch_angle: string
  watchout: string
}

type ObjectionResponse = {
  objection: string
  response: string
}

export type ClientSmartInsights = {
  source: 'openrouter' | 'calculated'
  fallback_reason?: string
  executive_summary: string
  special_insights: Array<{ title: string; insight: string; evidence: string }>
  project_strategy: ProjectStrategy[]
  pitch_plan: {
    opening: string
    discovery_questions: string[]
    talking_points: string[]
    objection_responses: ObjectionResponse[]
    close: string
  }
  next_action: string
}

function text(value: unknown, fallback = '', maxLength = 420) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : fallback
}

function stringList(value: unknown, limit: number, maxLength = 180) {
  if (!Array.isArray(value)) return []
  return value.map(item => text(item, '', maxLength)).filter(Boolean).slice(0, limit)
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse(fenced ?? content)
}

function projectRows(input: SmartInsightInput) {
  return Array.isArray(input.recommendations) ? input.recommendations.slice(0, 5) : []
}

function calculatedFallback(input: SmartInsightInput): ClientSmartInsights {
  const client = input.client ?? {}
  const preferences = input.preferences ?? {}
  const rows = projectRows(input)
  const name = text(client.full_name, 'This client', 80)
  const status = text(client.status, text(preferences.buyingStatus, 'unclassified'))
  const budget = text(preferences.budget, 'an unconfirmed budget')
  const locations = stringList(preferences.locations, 4, 80)
  const configurations = stringList(preferences.configurations, 4, 80)
  const requirement = [configurations.join(' / '), locations.join(' / '), budget].filter(Boolean).join(', ')

  const strategies = rows.map((row, index) => {
    const property = (row.property && typeof row.property === 'object') ? row.property as Record<string, unknown> : {}
    const pitchPoints = stringList(row.pitch_points, 4)
    const warnings = stringList(row.warnings, 2)
    return {
      property_id: text(property.id, '', 80),
      project_name: text(property.name, `Option ${index + 1}`, 120),
      priority: index + 1,
      why_now: stringList(row.match_reasons, 1)[0] ?? 'Ranked by the CRM property matcher.',
      pitch_angle: pitchPoints[1] ?? pitchPoints[0] ?? 'Validate the requirement before presenting this option.',
      watchout: warnings[0] ?? 'Confirm live inventory before commitment.',
    }
  })

  return {
    source: 'calculated',
    executive_summary: `${name} currently has ${status.replaceAll('_', ' ')} intent. Use ${requirement || 'a requirement-confirmation call'} to narrow the decision before presenting projects.`,
    special_insights: [
      {
        title: 'Decision readiness',
        insight: text(preferences.siteVisitStatus) === 'visited'
          ? 'A prior visit makes decision blockers more important than another broad presentation.'
          : 'The next milestone should be a focused project presentation followed by a site visit.',
        evidence: text(preferences.siteVisitStatus, 'No completed site visit is recorded.'),
      },
      {
        title: 'Requirement confidence',
        insight: budget !== 'an unconfirmed budget' && (locations.length > 0 || configurations.length > 0)
          ? 'The recorded requirement is specific enough for a short, ranked shortlist.'
          : 'Missing preference data should be confirmed before treating the ranking as final.',
        evidence: requirement || 'Core requirement fields are incomplete.',
      },
      {
        title: 'Conversation strategy',
        insight: Number(client.total_inquiries ?? 0) > 1
          ? 'Treat this as continuing intent and ask what changed since the earlier enquiry.'
          : 'Use the first conversation to establish decision criteria and timing.',
        evidence: `${Number(client.total_inquiries ?? 0) || 1} recorded enquiry or enquiries.`,
      },
    ],
    project_strategy: strategies,
    pitch_plan: {
      opening: strategies[0]
        ? `I shortlisted ${strategies[0].project_name} around your recorded requirement. Before I explain it, may I confirm your most important decision factor?`
        : 'Before I shortlist a project, may I reconfirm your budget, location, configuration and timeline?',
      discovery_questions: [
        'Which matters most now: location, layout, budget, possession or return potential?',
        'What prevented you from choosing an option during your earlier search?',
        'Who else will be involved in the final decision?',
      ],
      talking_points: strategies.slice(0, 3).map(item => `${item.project_name}: ${item.pitch_angle}`),
      objection_responses: [
        { objection: 'Price feels high', response: 'Compare the total fit and available unit options, then confirm the client’s comfortable stretch before negotiating.' },
        { objection: 'Need more options', response: 'Ask which criterion is missing, then show only one contrasting alternative that solves it.' },
      ],
      close: 'Which option feels closest to the requirement? I can confirm inventory and arrange a focused visit for the best two.',
    },
    next_action: strategies[0]
      ? `Confirm current inventory for ${strategies[0].project_name}, then contact the client with the tailored opening.`
      : 'Complete the missing requirement fields before making a project promise.',
  }
}

function cleanAiResult(value: unknown, fallback: ClientSmartInsights): ClientSmartInsights | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const rawInsights = Array.isArray(raw.special_insights) ? raw.special_insights : []
  const rawStrategies = Array.isArray(raw.project_strategy) ? raw.project_strategy : []
  const rawPitch = raw.pitch_plan && typeof raw.pitch_plan === 'object'
    ? raw.pitch_plan as Record<string, unknown>
    : {}
  const allowedProjects = new Map(fallback.project_strategy.map(item => [item.property_id, item]))

  const specialInsights = rawInsights.slice(0, 3).map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    return { title: text(row.title, '', 70), insight: text(row.insight), evidence: text(row.evidence, '', 220) }
  }).filter(item => item.title && item.insight && item.evidence)

  const projectStrategy = rawStrategies.slice(0, 5).map((item, index) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const propertyId = text(row.property_id, '', 80)
    const allowed = allowedProjects.get(propertyId)
    return {
      property_id: propertyId,
      project_name: allowed?.project_name ?? '',
      priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : index + 1,
      why_now: text(row.why_now),
      pitch_angle: text(row.pitch_angle),
      watchout: text(row.watchout),
    }
  }).filter(item => allowedProjects.has(item.property_id) && item.project_name && item.pitch_angle)

  const objections = Array.isArray(rawPitch.objection_responses)
    ? rawPitch.objection_responses.slice(0, 4).map(item => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
        return { objection: text(row.objection, '', 120), response: text(row.response) }
      }).filter(item => item.objection && item.response)
    : []

  const mergedInsights = [
    ...specialInsights,
    ...fallback.special_insights.filter(item => !specialInsights.some(aiItem => aiItem.title === item.title)),
  ].slice(0, 3)
  const strategyById = new Map(projectStrategy.map(item => [item.property_id, item]))
  const mergedStrategies = fallback.project_strategy.map(item => strategyById.get(item.property_id) ?? item)

  return {
    source: 'openrouter',
    executive_summary: text(raw.executive_summary) || fallback.executive_summary,
    special_insights: mergedInsights,
    project_strategy: mergedStrategies,
    pitch_plan: {
      opening: text(rawPitch.opening) || fallback.pitch_plan.opening,
      discovery_questions: stringList(rawPitch.discovery_questions, 4).length > 0
        ? stringList(rawPitch.discovery_questions, 4)
        : fallback.pitch_plan.discovery_questions,
      talking_points: stringList(rawPitch.talking_points, 5).length > 0
        ? stringList(rawPitch.talking_points, 5)
        : fallback.pitch_plan.talking_points,
      objection_responses: objections.length > 0 ? objections : fallback.pitch_plan.objection_responses,
      close: text(rawPitch.close) || fallback.pitch_plan.close,
    },
    next_action: text(raw.next_action) || fallback.next_action,
  }
}

function fallbackWithReason(fallback: ClientSmartInsights, reason: string): ClientSmartInsights {
  return { ...fallback, fallback_reason: reason }
}

function providerErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const raw = payload as Record<string, unknown>
  const topError = raw.error && typeof raw.error === 'object' ? raw.error as Record<string, unknown> : null
  const choice = Array.isArray(raw.choices) && raw.choices[0] && typeof raw.choices[0] === 'object'
    ? raw.choices[0] as Record<string, unknown>
    : null
  const choiceError = choice?.error && typeof choice.error === 'object'
    ? choice.error as Record<string, unknown>
    : null
  return text(topError?.message ?? choiceError?.message, '', 180) || null
}

function safeInput(input: SmartInsightInput) {
  const client = input.client ?? {}
  const preferences = input.preferences ?? {}
  return {
    client: {
      status: text(client.status, '', 50),
      status_note: text(client.status_note, '', 250),
      tier: text(client.tier, '', 50),
      total_inquiries: Number(client.total_inquiries ?? 0),
      first_seen_at: text(client.first_seen_at, '', 40),
      last_seen_at: text(client.last_seen_at, '', 40),
    },
    preferences: {
      budget: text(preferences.budget, '', 80),
      configurations: stringList(preferences.configurations, 5, 80),
      locations: stringList(preferences.locations, 5, 100),
      current_area: text(preferences.currentArea, '', 100),
      current_city: text(preferences.currentCity, '', 100),
      buying_status: text(preferences.buyingStatus, '', 60),
      call_status: text(preferences.callStatus, '', 60),
      site_visit_status: text(preferences.siteVisitStatus, '', 60),
      profession: text(preferences.profession, '', 100),
      company: text(preferences.company, '', 120),
      previous_project: text(preferences.previousProject, '', 120),
      remarks: text(preferences.remarks, '', 350),
      follow_up_date: text(preferences.followUpDate, '', 40),
    },
    history: (Array.isArray(input.history) ? input.history : []).slice(0, 8).map(row => ({
      campaign: text(row.campaign_name, '', 120),
      source: text(row.source, '', 60),
      status: text(row.status, '', 60),
      received_at: text(row.received_at, '', 40),
      buying_status: text((row.crm as Record<string, unknown> | null)?.buying_status, '', 60),
      site_visit_status: text((row.crm as Record<string, unknown> | null)?.site_visit_status, '', 60),
    })),
    recommendations: projectRows(input).map(row => {
      const property = row.property && typeof row.property === 'object' ? row.property as Record<string, unknown> : {}
      return {
        property: {
          id: text(property.id, '', 80),
          name: text(property.name, '', 120),
          type: text(property.type, '', 60),
          location: text(property.location, '', 100),
          area: text(property.area, '', 100),
          price: property.price,
          status: text(property.status, '', 50),
          developer: text(property.developer, '', 120),
          sample_house: Boolean(property.sampleHouse),
        },
        score: Number(row.score ?? 0),
        match_reasons: stringList(row.match_reasons, 6),
        pitch_points: stringList(row.pitch_points, 5),
        warnings: stringList(row.warnings, 4),
      }
    }),
  }
}

@Injectable()
export class ClientSmartInsightsService {
  private readonly logger = new Logger(ClientSmartInsightsService.name)

  async analyze(input: SmartInsightInput): Promise<ClientSmartInsights> {
    const fallback = calculatedFallback(input)
    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) return fallbackWithReason(fallback, 'The API server does not have OPENROUTER_API_KEY available. Restart or redeploy the API after setting it.')

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://crm.pikorua.in',
          'X-Title': 'Pikorua CRM Smart Matching',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
          temperature: 0.2,
          max_tokens: 1400,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a senior Ahmedabad luxury real-estate sales strategist. Analyze only the supplied CRM evidence and already-ranked live property matches. Never invent client facts, availability, amenities, returns, prices or project details. Missing facts must be framed as questions to confirm. Return strict JSON with: executive_summary string; special_insights exactly 3 objects {title,insight,evidence}; project_strategy array matching supplied property IDs with {property_id,project_name,priority,why_now,pitch_angle,watchout}; pitch_plan {opening,discovery_questions array,talking_points array,objection_responses array of {objection,response},close}; next_action string. Be concise, specific, ethical and sales-ready. Do not include phone numbers, email addresses, markdown or generic praise.',
            },
            { role: 'user', content: JSON.stringify(safeInput(input)) },
          ],
        }),
        signal: AbortSignal.timeout(15_000),
      })

      const payload = await response.json().catch(() => null) as {
        error?: { message?: string }
        choices?: Array<{ message?: { content?: string }; error?: { message?: string } }>
      } | null
      const providerError = providerErrorMessage(payload)

      if (!response.ok) {
        this.logger.warn(`OpenRouter Smart Matching request failed (${response.status}): ${providerError ?? 'No error message'}`)
        const guidance = response.status === 401 || response.status === 403
          ? 'OpenRouter rejected the API credentials. Verify the key is set on the API deployment, then redeploy it.'
          : response.status === 402
            ? 'OpenRouter reports insufficient credits for this key.'
            : response.status === 429
              ? 'OpenRouter rate-limited the request. Try again shortly or review the key limits.'
              : `OpenRouter returned HTTP ${response.status}. Check the API deployment logs for the provider message.`
        return fallbackWithReason(fallback, guidance)
      }

      if (providerError) {
        this.logger.warn(`OpenRouter Smart Matching provider error: ${providerError}`)
        return fallbackWithReason(fallback, 'OpenRouter accepted the request but its model provider failed. Try again or select another OPENROUTER_MODEL.')
      }

      const content = payload.choices?.[0]?.message?.content
      if (!content) {
        this.logger.warn('OpenRouter Smart Matching response contained no message content')
        return fallbackWithReason(fallback, 'OpenRouter returned an empty response. Try again or review the configured model.')
      }

      try {
        return cleanAiResult(extractJson(content), fallback) ?? fallbackWithReason(fallback, 'OpenRouter returned an unreadable AI response.')
      } catch (error) {
        this.logger.warn(`OpenRouter Smart Matching JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`)
        return fallbackWithReason(fallback, 'OpenRouter answered, but its response was not valid JSON. Try again.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`OpenRouter Smart Matching request error: ${message}`)
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      return fallbackWithReason(
        fallback,
        timedOut
          ? 'The OpenRouter request timed out. Try again or use a faster model.'
          : 'The API server could not reach OpenRouter. Check outbound network access and deployment logs.',
      )
    }
  }
}
