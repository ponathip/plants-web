import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
const token =
  req.cookies.get("accessToken")?.value ||
  req.headers.get("cookie")?.includes("accessToken")
  console.log("COOKIES:", req.headers.get("cookie"))
  const { pathname } = req.nextUrl

  // 🔐 หน้า protected
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 🔄 ถ้า login แล้ว พยายามเข้า /login → ส่งไป dashboard
  if (pathname === '/login' && token) {
    const dashboardUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
