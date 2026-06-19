/**
 * Validates environment configuration at startup so a misconfigured deployment
 * fails fast with a single, complete error instead of crashing on the first
 * request that happens to need a missing variable.
 *
 * Wired into `ConfigModule.forRoot({ validate })`.
 */

// Hard requirements: the app cannot function safely without these.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'] as const

// Recommended: missing these only breaks specific features, so warn instead of
// aborting (keeps local/dev boots painless).
const RECOMMENDED = ['CORS_ORIGIN', 'SUPABASE_SERVICE_ROLE_KEY', 'META_WEBHOOK_VERIFY_TOKEN'] as const

const MIN_JWT_SECRET_LENGTH = 32

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

  const recommendedMissing = RECOMMENDED.filter((key) => !config[key])
  if (recommendedMissing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Recommended environment variable(s) not set: ${recommendedMissing.join(', ')}. ` +
        'Some features may be disabled or insecure.',
    )
  }

  return config
}
