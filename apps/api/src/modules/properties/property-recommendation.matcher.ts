type UnitConfiguration = {
  configuration?: string | null
  area_sqft?: string | null
  carpet_area_sqft?: string | null
  basic_rate?: string | null
  price?: string | null
  price_min?: number | string | null
}

type RecommendationProperty = {
  id: string
  name: string
  type: string
  location: string
  area?: string | null
  price: number | string
  pricePerSqft?: number | string | null
  status: string
  roi?: number | string | null
  developer?: string | null
  sampleHouse?: boolean | null
  featured?: boolean | null
  unitConfigurations?: UnitConfiguration[] | null
  images?: unknown[]
  amenities?: unknown[]
  appreciation?: unknown[]
  deletedAt?: Date | string | null
}

export type PropertyRecommendationInput = {
  budgetRange?: string | null
  configuration?: string[] | null
  currentArea?: string | null
  currentCity?: string | null
  leadCity?: string | null
  limit?: number | null
}

export type PropertyRecommendation = {
  property: RecommendationProperty
  score: number
  match_reasons: string[]
  pitch_points: string[]
  warnings: string[]
  matched_units: UnitConfiguration[]
}

type BudgetRange = {
  label: string
  max: number
  isOpenEnded: boolean
}

export function parseBudgetRange(value: string | null | undefined): BudgetRange | null {
  if (!value) return null

  const normalized = value
    .toLowerCase()
    .replace(/₹|rs\.?|inr|,/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const crMatch = normalized.match(/(\d+(?:\.\d+)?)\s*cr/)
  if (crMatch) {
    return {
      label: value,
      max: Number(crMatch[1]) * 10000000,
      isOpenEnded: normalized.includes("+") || normalized.includes("above"),
    }
  }

  const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(l|lac|lakh)/)
  if (lakhMatch) {
    return {
      label: value,
      max: Number(lakhMatch[1]) * 100000,
      isOpenEnded: normalized.includes("+") || normalized.includes("above"),
    }
  }

  return null
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const crMatch = trimmed.toLowerCase().replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*cr/)
  if (crMatch) return Number(crMatch[1]) * 10000000

  const numeric = Number(trimmed.replace(/[^0-9.]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function hasWordMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right) return false
  return left.includes(right) || right.includes(left)
}

function unitPrice(unit: UnitConfiguration) {
  return toNumber(unit.price_min) ?? toNumber(unit.price) ?? null
}

function getMatchedUnits(property: RecommendationProperty, selectedConfigurations: string[], budget: BudgetRange | null) {
  const units = Array.isArray(property.unitConfigurations) ? property.unitConfigurations : []
  if (units.length === 0) return []

  return units.filter((unit) => {
    const configMatches = selectedConfigurations.length === 0 ||
      selectedConfigurations.some((config) => hasWordMatch(unit.configuration, config))
    const price = unitPrice(unit)
    const budgetMatches = !budget || !price || price <= budget.max * 1.1
    return configMatches && budgetMatches
  })
}

function propertyMatchesConfiguration(property: RecommendationProperty, selectedConfigurations: string[], matchedUnits: UnitConfiguration[]) {
  if (selectedConfigurations.length === 0) return true
  if (matchedUnits.length > 0) return true

  return selectedConfigurations.some((config) => (
    hasWordMatch(property.type, config) ||
    hasWordMatch(property.name, config)
  ))
}

function propertyPriceStatus(property: RecommendationProperty, matchedUnits: UnitConfiguration[], budget: BudgetRange | null) {
  if (!budget) return { score: 0, reason: null as string | null, warning: "No client budget selected yet." }

  const prices = [
    toNumber(property.price),
    ...matchedUnits.map(unitPrice),
  ].filter((price): price is number => price !== null)

  if (prices.some((price) => price <= budget.max)) {
    return { score: 40, reason: `Fits ${budget.label} budget.`, warning: null }
  }

  if (prices.some((price) => price <= budget.max * 1.1)) {
    return { score: 28, reason: `Stretch option within 10% of ${budget.label}.`, warning: "This is a stretch option. Confirm comfort before pitching." }
  }

  return { score: 0, reason: null, warning: `Above ${budget.label} budget.` }
}

function locationScore(property: RecommendationProperty, input: PropertyRecommendationInput) {
  const terms = [input.currentArea, input.currentCity, input.leadCity].filter(Boolean) as string[]
  if (terms.length === 0) return { score: 0, reason: null as string | null }

  const matchedTerm = terms.find((term) => (
    hasWordMatch(property.area, term) ||
    hasWordMatch(property.location, term)
  ))

  return matchedTerm
    ? { score: 15, reason: `Location matches ${matchedTerm}.` }
    : { score: 0, reason: null }
}

export function buildPropertyRecommendations(
  properties: RecommendationProperty[],
  input: PropertyRecommendationInput,
): PropertyRecommendation[] {
  const budget = parseBudgetRange(input.budgetRange)
  const selectedConfigurations = (input.configuration ?? []).filter(Boolean)
  const limit = Math.max(1, Math.min(input.limit ?? 3, 10))

  return properties
    .filter((property) => (
      !property.deletedAt &&
      property.status !== "sold" &&
      property.status !== "reserved"
    ))
    .map((property) => {
      const matchedUnits = getMatchedUnits(property, selectedConfigurations, budget)
      const budgetResult = propertyPriceStatus(property, matchedUnits, budget)
      const configurationMatches = propertyMatchesConfiguration(property, selectedConfigurations, matchedUnits)
      const locationResult = locationScore(property, input)
      const scoreParts = {
        budget: budgetResult.score,
        configuration: configurationMatches ? 25 : 0,
        location: locationResult.score,
        visit: property.sampleHouse ? 10 : 0,
        completeness: Math.min(10, (property.featured ? 4 : 0) + (toNumber(property.roi) ? 3 : 0) + (property.developer ? 3 : 0)),
      }
      const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0)

      const matchReasons = [
        budgetResult.reason,
        configurationMatches && selectedConfigurations.length > 0 ? `Configuration matches ${selectedConfigurations.join(", ")}.` : null,
        locationResult.reason,
        property.sampleHouse ? "Sample house is available for site visit pitch." : null,
        property.featured ? "Marked as priority inventory." : null,
      ].filter((reason): reason is string => Boolean(reason))

      const warnings = [
        budgetResult.warning,
        selectedConfigurations.length > 0 && !configurationMatches ? `No exact ${selectedConfigurations.join(", ")} configuration match found.` : null,
        property.status === "upcoming" ? "Upcoming project. Confirm launch and possession timeline before pitching." : null,
        "Confirm latest inventory and availability before commitment.",
      ].filter((warning): warning is string => Boolean(warning))

      const pitchPoints = [
        `${property.name} is a ${property.status} ${property.type} option in ${[property.location, property.area].filter(Boolean).join(", ")}.`,
        budgetResult.reason ?? "Use this after confirming the client's budget comfort.",
        matchedUnits.length > 0
          ? `Relevant units: ${matchedUnits.map((unit) => unit.configuration).filter(Boolean).join(", ")}.`
          : configurationMatches && selectedConfigurations.length > 0
            ? `Matches requested ${selectedConfigurations.join(", ")} preference.`
            : "Position it as an alternate option if the client is flexible.",
        property.sampleHouse ? "Use sample house availability to push for a site visit." : "Confirm visit slot with the developer before scheduling.",
      ]

      return {
        property,
        score,
        match_reasons: matchReasons,
        pitch_points: pitchPoints,
        warnings,
        matched_units: matchedUnits,
        budget_score: scoreParts.budget,
      } as PropertyRecommendation & { budget_score: number }
    })
    .filter((recommendation) => recommendation.score > 0 && (!budget || recommendation.budget_score > 0))
    .sort((a, b) => {
      if (a.property.status !== b.property.status) {
        if (a.property.status === "available") return -1
        if (b.property.status === "available") return 1
      }
      return b.score - a.score
    })
    .slice(0, limit)
    .map(({ budget_score: _budgetScore, ...recommendation }) => recommendation)
}
