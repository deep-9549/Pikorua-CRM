import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const POST = (req: NextRequest) => proxyToApi(req, '/leads/bulk-delete')
