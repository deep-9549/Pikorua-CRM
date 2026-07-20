import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

const VOICE_HEADERS = [
  'x-signature',
  'x-timestamp',
  'idempotency-key',
  'x-request-id',
]

export const POST = (request: NextRequest) =>
  proxyToApi(request, '/v1/voice/call-results', {
    authorization: 'request',
    forwardHeaders: VOICE_HEADERS,
  })
