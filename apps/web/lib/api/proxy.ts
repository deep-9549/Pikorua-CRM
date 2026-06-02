import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

export async function proxyToApi(
  request: NextRequest,
  path: string,
): Promise<NextResponse> {
  const cookieStore = await cookies()
  const token = cookieStore.get('pikorua_token')?.value

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Forward query params
  const url = new URL(`${API_BASE}/api${path}`)
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try { body = JSON.stringify(await request.json()) } catch {}
  }

  try {
    const res = await fetch(url.toString(), {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'API unreachable' }, { status: 503 })
  }
}
