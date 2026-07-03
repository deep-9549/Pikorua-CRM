import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

function buildPath(req: NextRequest) {
  const path = req.nextUrl.pathname
    .split('/api/dashboard/ai-analytics/')
    .at(1)
    ?.replace(/^\/+/, '')

  return `/dashboard/ai-analytics/${path ?? 'overview'}`
}

export const GET = (req: NextRequest) => proxyToApi(req, buildPath(req))
