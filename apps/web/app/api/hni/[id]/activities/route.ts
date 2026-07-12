import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export const POST = (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => params.then(({ id }) => proxyToApi(req, `/hni/${id}/activities`))
