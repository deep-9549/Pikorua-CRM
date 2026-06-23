export interface MetaPageConfig {
  pageId: string
  pageName: string | null
  accessToken: string
  enabled: boolean
}

interface RawMetaPageConfig {
  page_id?: unknown
  pageId?: unknown
  page_name?: unknown
  pageName?: unknown
  access_token?: unknown
  accessToken?: unknown
  enabled?: unknown
}

const asNonEmptyString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseMetaPageConfigs(env: NodeJS.ProcessEnv = process.env): MetaPageConfig[] {
  const rawJson = asNonEmptyString(env.META_PAGES)
  if (rawJson) {
    let parsed: unknown
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      throw new Error('META_PAGES must be a valid JSON array')
    }

    if (!Array.isArray(parsed)) {
      throw new Error('META_PAGES must be a JSON array')
    }

    return parsed.map((rawEntry, index) => {
      const entry = rawEntry as RawMetaPageConfig
      const pageId = asNonEmptyString(entry.page_id ?? entry.pageId)
      const accessToken = asNonEmptyString(entry.access_token ?? entry.accessToken)
      const pageName = asNonEmptyString(entry.page_name ?? entry.pageName)

      if (!pageId || !accessToken) {
        throw new Error(
          `META_PAGES[${index}] must include page_id and access_token`,
        )
      }

      return {
        pageId,
        pageName,
        accessToken,
        enabled: entry.enabled !== false,
      }
    }).filter((entry) => entry.enabled)
  }

  const pageId = asNonEmptyString(env.META_PAGE_ID)
  const accessToken = asNonEmptyString(env.META_PAGE_ACCESS_TOKEN)
  if (!pageId || !accessToken) return []

  return [{
    pageId,
    pageName: null,
    accessToken,
    enabled: true,
  }]
}

export function findMetaPageConfig(
  pageId: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): MetaPageConfig | null {
  if (!pageId) return null
  return parseMetaPageConfigs(env).find((entry) => entry.pageId === pageId) ?? null
}
