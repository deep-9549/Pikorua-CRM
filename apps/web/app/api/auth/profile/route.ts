import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export async function PATCH(req: NextRequest) {
  return proxyToApi(req, '/auth/profile')
}
