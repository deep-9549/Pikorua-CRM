'use client'

const TOKEN_KEY = 'pikorua_token'
const USER_KEY = 'pikorua_user'

export interface AuthUser {
  id: string
  name: string | null
  email: string | null
  role: string
}

export function getAuthUser(): AuthUser | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${USER_KEY}=`))
    ?.split('=')[1]
  if (!raw) return null
  try { return JSON.parse(decodeURIComponent(raw)) } catch { return null }
}

export function clearAuthCookies() {
  const base = `; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  document.cookie = `${TOKEN_KEY}=${base}`
  document.cookie = `${USER_KEY}=${base}`
}

export function updateAuthUser(user: AuthUser) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const maxAge = 60 * 60 * 24 * 7
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent('pikorua:user-updated', { detail: user }))
}
