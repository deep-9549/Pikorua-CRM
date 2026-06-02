import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

type Ctx = { params: Promise<{ id: string }> }

export const GET = async (req: NextRequest, { params }: Ctx) =>
  proxyToApi(req, `/clients/${(await params).id}`)
export const PATCH = async (req: NextRequest, { params }: Ctx) =>
  proxyToApi(req, `/clients/${(await params).id}`)
