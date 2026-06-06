import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

type Ctx = { params: Promise<{ id: string }> }

export const POST = async (req: NextRequest, { params }: Ctx) =>
  proxyToApi(req, `/meta-leads/${(await params).id}/unassign`)
