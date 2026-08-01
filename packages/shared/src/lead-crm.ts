export const NOT_PROVIDED_BY_CLIENT = 'Not provided by client' as const

export const CLIENT_STATUS_VALUES = [
  'hot',
  'warm',
  'cold',
  'postponed',
  'lost',
  'low_budget',
  'not_interested',
  'broker',
  'construction_biz_owner',
] as const

export type ClientStatus = (typeof CLIENT_STATUS_VALUES)[number]

export const ANTI_BROKER_COMPATIBLE_STATUSES = ['hot', 'warm', 'cold'] as const

export type SpokenRequiredField =
  | 'budget_range'
  | 'profession'
  | 'current_city'
  | 'current_area'

export type SpokenLeadDetails = Partial<Record<SpokenRequiredField, string | null | undefined>> & {
  call_status?: string | null
}

export const SPOKEN_REQUIRED_FIELD_LABELS: Record<SpokenRequiredField, string> = {
  budget_range: 'Budget',
  profession: 'Profession',
  current_city: 'Current City',
  current_area: 'Current Area',
}

export function missingSpokenLeadFields(details: SpokenLeadDetails): SpokenRequiredField[] {
  if (details.call_status !== 'spoken') return []

  return (Object.keys(SPOKEN_REQUIRED_FIELD_LABELS) as SpokenRequiredField[])
    .filter(field => !details[field]?.trim())
}

export function isAntiBrokerCompatibleStatus(status: string | null | undefined) {
  return ANTI_BROKER_COMPATIBLE_STATUSES.includes(status as (typeof ANTI_BROKER_COMPATIBLE_STATUSES)[number])
}
