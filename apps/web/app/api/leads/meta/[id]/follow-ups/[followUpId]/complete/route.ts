import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

type Ctx = { params: Promise<{ id: string; followUpId: string }> }

export const PATCH = async (req: NextRequest, { params }: Ctx) => {
  const { id, followUpId } = await params
  return proxyToApi(req, `/leads/${id}/follow-ups/${followUpId}/complete`)
}
