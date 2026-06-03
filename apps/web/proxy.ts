import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-in-production'
)

const PROTECTED = [
  '/dashboard', '/leads', '/meta-ads', '/whatsapp', '/properties',
  '/employees', '/site-visits', '/bookings', '/reports', '/settings',
  '/scripts', '/documents', '/ai-control', '/smart-matching', '/hni-clients',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('pikorua_token')?.value
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))

  let isValid = false
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      isValid = true
    } catch {}
  }

  if (!isValid && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isValid && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
