import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

export async function POST(request: NextRequest) {
  const body = await request.json()

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
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
