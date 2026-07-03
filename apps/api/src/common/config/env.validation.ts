/**
 * Validates environment configuration at startup so a misconfigured deployment
 * fails fast with a single, complete error instead of crashing on the first
 * request that happens to need a missing variable.
 *
 * Wired into `ConfigModule.forRoot({ validate })`.
 */
import { parseMicrositeLeadSourceConfigs } from '../../modules/microsite-lead-sync/microsite-lead-source-config'

// Hard requirements: the app cannot function safely without these.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'] as const

// Recommended: missing these only breaks specific features, so warn instead of
// aborting (keeps local/dev boots painless).
const RECOMMENDED = [
  'CORS_ORIGIN',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_PAGES',
  'META_PAGE_ACCESS_TOKEN',
  'META_APP_SECRET',
  'META_GRAPH_API_VERSION',
  'META_PAGE_ID',
  'CRON_SECRET',
  'VOICE_API_BEARER_TOKEN',
  'VOICE_WEBHOOK_HMAC_SECRET',
] as const

const MIN_JWT_SECRET_LENGTH = 32

function parseMetaPages(value: unknown): unknown[] | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('META_PAGES must be a valid JSON array.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('META_PAGES must be a JSON array.')
  }

  for (const [index, entry] of parsed.entries()) {
    const raw = entry as Record<string, unknown>
    const pageId = raw.page_id ?? raw.pageId
    const accessToken = raw.access_token ?? raw.accessToken
    if (typeof pageId !== 'string' || pageId.trim() === '') {
      throw new Error(`META_PAGES[${index}] is missing page_id.`)
    }
    if (typeof accessToken !== 'string' || accessToken.trim() === '') {
      throw new Error(`META_PAGES[${index}] is missing access_token.`)
    }
  }

  return parsed
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => {
    const value = config[key]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Set them in your environment or .env file before starting the API.',
    )
  }

  if (String(config.WEBSITE_LEAD_SYNC_ENABLED).toLowerCase() === 'true') {
    const websiteSyncMissing = ['WEBSITE_SUPABASE_URL', 'WEBSITE_SUPABASE_SERVICE_ROLE_KEY']
      .filter((key) => !config[key])
    if (websiteSyncMissing.length > 0) {
      throw new Error(
        `Website lead sync is enabled but missing: ${websiteSyncMissing.join(', ')}.`,
      )
    }
  }

  if (String(config.MICROSITE_LEAD_SYNC_ENABLED).toLowerCase() === 'true') {
    const sources = parseMicrositeLeadSourceConfigs(config)
    if (sources.length === 0) {
      throw new Error(
        'Microsite lead sync is enabled but no sources are configured. ' +
          'Set MICROSITE_LEAD_SOURCES_JSON.',
      )
    }
  }

  if (String(config.META_LEAD_SYNC_ENABLED).toLowerCase() === 'true') {
    const configuredPages = parseMetaPages(config.META_PAGES)
    const hasMultiPageConfig = configuredPages !== null && configuredPages.length > 0
    const hasLegacyPageConfig = Boolean(config.META_PAGE_ID && config.META_PAGE_ACCESS_TOKEN)
    const metaSyncMissing = [
      'META_GRAPH_API_VERSION',
      'CRON_SECRET',
    ].filter((key) => !config[key])
    if (!hasMultiPageConfig && !hasLegacyPageConfig) {
      metaSyncMissing.push('META_PAGES or META_PAGE_ID/META_PAGE_ACCESS_TOKEN')
    }
    if (metaSyncMissing.length > 0) {
      throw new Error(
        `Meta lead sync is enabled but missing: ${metaSyncMissing.join(', ')}.`,
      )
    }
  } else {
    parseMetaPages(config.META_PAGES)
  }

  // A short secret is a weakness, not a hard stop — warn rather than refuse to
  // boot, so this validation can never take down a running deployment whose
  // secret happens to be shorter than recommended.
  const jwtSecret = String(config.JWT_SECRET)
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] JWT_SECRET is shorter than the recommended ${MIN_JWT_SECRET_LENGTH} characters; ` +
        'consider rotating to a longer, random value.',
    )
  }

  const hasConfiguredMetaPages = typeof config.META_PAGES === 'string' &&
    config.META_PAGES.trim() !== ''
  const hasLegacyMetaPage = Boolean(config.META_PAGE_ID && config.META_PAGE_ACCESS_TOKEN)
  const recommendedMissing = RECOMMENDED.filter((key) => {
    if (hasConfiguredMetaPages && (key === 'META_PAGE_ID' || key === 'META_PAGE_ACCESS_TOKEN')) {
      return false
    }
    if (hasLegacyMetaPage && key === 'META_PAGES') {
      return false
    }
    return !config[key]
  })
  if (recommendedMissing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Recommended environment variable(s) not set: ${recommendedMissing.join(', ')}. ` +
        'Some features may be disabled or insecure.',
    )
  }

  return config
}
