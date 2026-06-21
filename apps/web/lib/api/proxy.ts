import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from './base-url'

export async function proxyToApi(
  request: NextRequest,
  path: string,
): Promise<NextResponse> {
  const cookieStore = await cookies()
  const token = cookieStore.get('pikorua_token')?.value

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const metaSignature = request.headers.get('x-hub-signature-256')
  if (metaSignature) headers['X-Hub-Signature-256'] = metaSignature

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Preserve webhook bytes so the API can verify Meta's request signature.
    try { body = await request.text() } catch {}
  }

  try {
    const apiBase = getApiBaseUrl(request)
    const url = new URL(`${apiBase}/api${path}`)
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

    const res = await fetch(url.toString(), {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('API proxy request failed', {
      path,
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json({ error: 'API unreachable' }, { status: 503 })
  }
}
