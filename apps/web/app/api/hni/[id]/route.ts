import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const GET = (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => params.then(({ id }) => proxyToApi(req, `/hni/${id}`))
export const PUT = (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => params.then(({ id }) => proxyToApi(req, `/hni/${id}`))
