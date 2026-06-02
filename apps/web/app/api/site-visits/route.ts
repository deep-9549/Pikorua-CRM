import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const GET = (req: NextRequest) => proxyToApi(req, '/site-visits')
export const POST = (req: NextRequest) => proxyToApi(req, '/site-visits')
