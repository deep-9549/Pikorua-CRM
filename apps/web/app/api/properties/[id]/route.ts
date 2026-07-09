import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const GET = (req: NextRequest) => {
  const id = req.nextUrl.pathname.split('/').at(-1)
  return proxyToApi(req, `/properties/${id ?? ''}`)
}
