import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/api/base-url'

// Disable Next.js body parsing — we forward the raw multipart stream
export const config = { api: { bodyParser: false } }

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('pikorua_token')?.value

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Forward the raw multipart body; do NOT set Content-Type — the browser boundary must be preserved
  const contentType = request.headers.get('content-type')
  if (contentType) headers['Content-Type'] = contentType

  try {
    const apiBase = getApiBaseUrl(request)
    const body = await request.arrayBuffer()

    const res = await fetch(`${apiBase}/api/import/meta-leads`, {
      method: 'POST',
      headers,
      body,
    })

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'API unreachable' }, { status: 503 })
  }
}
