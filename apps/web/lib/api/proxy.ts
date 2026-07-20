import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from './base-url'

type ProxyOptions = {
  authorization?: 'session' | 'request'
  forwardHeaders?: string[]
}

export async function proxyToApi(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {},
): Promise<NextResponse> {
  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('content-type') ?? 'application/json',
  }

  if (options.authorization === 'request') {
    const authorization = request.headers.get('authorization')
    if (authorization) headers.Authorization = authorization
  } else {
    const cookieStore = await cookies()
    const token = cookieStore.get('pikorua_token')?.value
    if (token) headers.Authorization = `Bearer ${token}`
  }

  for (const name of options.forwardHeaders ?? []) {
    const value = request.headers.get(name)
    if (value) headers[name] = value
  }

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
