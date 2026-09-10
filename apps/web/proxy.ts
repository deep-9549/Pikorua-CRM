import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'super_admin' | 'sales_executive'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-in-production'
)

const PROTECTED = [
  '/dashboard', '/leads', '/meta-ads', '/whatsapp', '/properties',
  '/employees', '/site-visits', '/bookings', '/reports', '/settings',
  '/scripts', '/documents', '/ai-control', '/ai-voice', '/smart-matching', '/hni-clients',
  // Signed-in only, not admin-only: executives see their own performance here.
  '/employee-performance-analysis',
]

const ADMIN_ONLY = [
  '/meta-ads',
  '/employees',
  '/reports',
  '/ai-control',
  '/ai-voice',
  '/hni-clients',
]

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('pikorua_token')?.value
  const isProtected = PROTECTED.some(p => matchesRoute(pathname, p))
  const isAdminOnly = ADMIN_ONLY.some(p => matchesRoute(pathname, p))

  let isValid = false
  let role: UserRole | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      isValid = true
      role = payload.role === 'super_admin' || payload.role === 'sales_executive'
        ? payload.role
        : null
    } catch {}
  }

  if (!isValid && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isValid && isAdminOnly && role !== 'super_admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
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
