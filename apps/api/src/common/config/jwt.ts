/**
 * Single source of truth for the JWT signing secret. Throws at startup if the
 * secret is missing so a misconfigured deployment fails fast instead of
 * silently falling back to a hardcoded, publicly-known value (which would let
 * anyone forge tokens for any user).
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return secret
}
