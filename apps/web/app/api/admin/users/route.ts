import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const GET = (req: NextRequest) => proxyToApi(req, '/users')
export const POST = (req: NextRequest) => proxyToApi(req, '/users')
export const DELETE = (req: NextRequest) => proxyToApi(req, '/users')
