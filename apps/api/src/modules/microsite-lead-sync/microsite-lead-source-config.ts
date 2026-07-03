export interface MicrositeLeadSourceConfig {
  key: string
  label: string
  supabaseUrl: string
  serviceRoleKey: string
  enabled: boolean
}

type RawMicrositeLeadSourceConfig = {
  key?: unknown
  label?: unknown
  supabaseUrl?: unknown
  supabase_url?: unknown
  serviceRoleKey?: unknown
  service_role_key?: unknown
  enabled?: unknown
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function readBoolean(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() !== 'false'
  return Boolean(value)
}

export function parseMicrositeLeadSourceConfigs(
  env: Record<string, unknown> = process.env,
): MicrositeLeadSourceConfig[] {
  const rawJson = readString(env.MICROSITE_LEAD_SOURCES_JSON)
  if (!rawJson) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('MICROSITE_LEAD_SOURCES_JSON must be a valid JSON array.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('MICROSITE_LEAD_SOURCES_JSON must be a JSON array.')
  }

  const seenKeys = new Set<string>()
  const sources: MicrositeLeadSourceConfig[] = []

  for (const [index, entry] of parsed.entries()) {
    const raw = entry as RawMicrositeLeadSourceConfig
    const key = readString(raw.key)
    const label = readString(raw.label) ?? key
    const supabaseUrl = readString(raw.supabaseUrl ?? raw.supabase_url)
    const serviceRoleKey = readString(raw.serviceRoleKey ?? raw.service_role_key)
    const enabled = readBoolean(raw.enabled)

    if (!key) {
      throw new Error(`MICROSITE_LEAD_SOURCES_JSON[${index}] is missing key.`)
    }
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(key)) {
      throw new Error(
        `MICROSITE_LEAD_SOURCES_JSON[${index}].key must use letters, numbers, dashes, or underscores.`,
      )
    }
    if (seenKeys.has(key)) {
      throw new Error(`MICROSITE_LEAD_SOURCES_JSON contains duplicate key "${key}".`)
    }
    if (!supabaseUrl) {
      throw new Error(`MICROSITE_LEAD_SOURCES_JSON[${index}] is missing supabaseUrl.`)
    }
    if (!/^https?:\/\//i.test(supabaseUrl)) {
      throw new Error(`MICROSITE_LEAD_SOURCES_JSON[${index}].supabaseUrl must be an http(s) URL.`)
    }
    if (!serviceRoleKey) {
      throw new Error(`MICROSITE_LEAD_SOURCES_JSON[${index}] is missing serviceRoleKey.`)
    }

    seenKeys.add(key)
    if (enabled) {
      sources.push({
        key,
        label: label ?? key,
        supabaseUrl: supabaseUrl.replace(/\/$/, ''),
        serviceRoleKey,
        enabled,
      })
    }
  }

  return sources
}
