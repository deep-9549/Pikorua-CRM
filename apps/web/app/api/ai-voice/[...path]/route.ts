import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

type Params = { params: Promise<{ path: string[] }> }

async function voicePath(params: Params['params']) {
  const path = (await params).path.join('/')
  return `/ai-voice/${path}`
}

export const GET = async (req: NextRequest, { params }: Params) => proxyToApi(req, await voicePath(params))
export const PATCH = async (req: NextRequest, { params }: Params) => proxyToApi(req, await voicePath(params))
