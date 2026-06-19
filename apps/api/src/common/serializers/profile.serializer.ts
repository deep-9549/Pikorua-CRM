/**
 * Canonical serializer for a user-profile sub-object embedded in API responses
 * (e.g. a lead's assignee, a site visit's scheduler, a client's status updater).
 *
 * Previously this logic was copy-pasted into three services with slightly
 * different shapes; this is the single source of truth. Accepts either the raw
 * Drizzle row (camelCase) or an already-snake_cased object.
 */
export interface SerializedProfile {
  id: string | null
  full_name: string | null
  email: string | null
  role: string | null
}

interface ProfileLike {
  id?: string | null
  fullName?: string | null
  full_name?: string | null
  email?: string | null
  role?: string | null
}

export function serializeProfile(profile: ProfileLike | null | undefined): SerializedProfile | null {
  if (!profile) return null

  return {
    id: profile.id ?? null,
    full_name: profile.fullName ?? profile.full_name ?? null,
    email: profile.email ?? null,
    role: profile.role ?? null,
  }
}
