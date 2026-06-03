import { NextRequest, NextResponse } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const GET = (req: NextRequest) => proxyToApi(req, '/users')
export const POST = (req: NextRequest) => proxyToApi(req, '/users')

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const userId = body?.userId

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  return proxyToApi(req, `/users/${userId}`)
}
