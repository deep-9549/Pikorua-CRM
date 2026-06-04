import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/api/base-url'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('pikorua_token')?.value

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const apiBase = getApiBaseUrl(request)
    const res = await fetch(`${apiBase}/api/import/template/meta-leads`, { headers })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to generate template' }, { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="pikorua-leads-template.xlsx"',
      },
    })
  } catch {
    return NextResponse.json({ error: 'API unreachable' }, { status: 503 })
  }
}
