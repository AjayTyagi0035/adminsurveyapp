import { NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/map', '/records']

export function middleware(request) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path))

  if (!isProtected) return NextResponse.next()

  const authToken = request.cookies.get('auth_token')?.value

  if (!authToken) {
    // Redirect unauthenticated users to /login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname) // preserve intended destination
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on these paths only (avoids running on _next/static etc.)
  matcher: ['/dashboard/:path*', '/map/:path*', '/records/:path*'],
}
