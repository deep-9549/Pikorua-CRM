import { NextRequest } from 'next/server'

export function getApiBaseUrl(request?: NextRequest) {
  const apiBase =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:4000'

  const trimmedApiBase = apiBase.replace(/\/+$/, '')
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction && /^https?:\/\/localhost(?::\d+)?$/i.test(trimmedApiBase)) {
    throw new Error('API_BASE_URL is not configured for production')
  }

  if (isProduction && request && trimmedApiBase === request.nextUrl.origin) {
    throw new Error('API_BASE_URL points to the web deployment instead of the API deployment')
  }

  return trimmedApiBase
}
