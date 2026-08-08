import { NextRequest, NextResponse } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const forwardedProtoValues = request.headers.get('x-forwarded-proto')?.split(',') ?? []
  const forwardedProto = forwardedProtoValues[forwardedProtoValues.length - 1]?.trim()

  if (process.env.NODE_ENV === 'production' && forwardedProto !== 'https') {
    return NextResponse.json({ message: 'HTTPS is required' }, { status: 426 })
  }

  return proxyToApi(request, '/hrm/activity', {
    authorization: 'request',
    forwardClientIp: true,
  })
}
