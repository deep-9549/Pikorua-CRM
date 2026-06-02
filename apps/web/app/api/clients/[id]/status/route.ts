import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = async (req: NextRequest, { params }: Ctx) =>
  proxyToApi(req, `/clients/${(await params).id}/status`)
export const PUT = async (req: NextRequest, { params }: Ctx) =>
  proxyToApi(req, `/clients/${(await params).id}/status`)
