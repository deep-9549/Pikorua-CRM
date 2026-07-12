import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const PATCH = (req: NextRequest, context: { params: Promise<{ id: string }> }) =>
  context.params.then(({ id }) => proxyToApi(req, `/bookings/${id}`))
