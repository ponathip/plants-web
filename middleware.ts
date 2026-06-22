import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const token =
    req.cookies.get("accessToken")?.value ||
    req.headers.get("cookie")?.includes("accessToken")

  const { pathname } = req.nextUrl

  // ✅ public routes ต้องอยู่บนสุด
  if (
    pathname === "/login" ||
    pathname.startsWith("/qr/plant") ||
    pathname.startsWith("/qr/varieties") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next()
  }

  // ✅ protected routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    if (!token) {
      const loginUrl = new URL("/login", req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ✅ login แล้วเข้า /login ให้ไป dashboard
  if (pathname === "/login" && token) {
    const dashboardUrl = new URL("/dashboard", req.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login", "/qr/plant/:path*"],
}