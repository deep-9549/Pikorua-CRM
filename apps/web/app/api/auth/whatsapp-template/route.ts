import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export async function GET(req: NextRequest) {
  return proxyToApi(req, '/auth/whatsapp-template')
}

export async function PUT(req: NextRequest) {
  return proxyToApi(req, '/auth/whatsapp-template')
}
