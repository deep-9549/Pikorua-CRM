import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/api/base-url'

export async function POST(request: NextRequest) {
  const body = await request.json()

  let res: Response
  try {
    const apiBase = getApiBaseUrl(request)

    res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.error('Login proxy request failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json({ error: 'API unreachable' }, { status: 503 })
  }

  const data = await res.json()
  if (!res.ok) return NextResponse.json(data, { status: res.status })

  const { access_token, user } = data
  const response = NextResponse.json({ user }, { status: 200 })

  const isProduction = process.env.NODE_ENV === 'production'
  const maxAge = 60 * 60 * 24 * 7 // 7 days

  response.cookies.set('pikorua_token', access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  response.cookies.set('pikorua_user', JSON.stringify(user), {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  return response
}
