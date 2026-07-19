import { NextRequest } from 'next/server'
import { proxyToApi } from '@/lib/api/proxy'

export async function POST(request: NextRequest) {
  const response = await proxyToApi(request, '/auth/reset-password')

  if (response.ok) {
    response.cookies.set('pikorua_token', '', { maxAge: 0, path: '/' })
    response.cookies.set('pikorua_user', '', { maxAge: 0, path: '/' })
  }

  return response
}
