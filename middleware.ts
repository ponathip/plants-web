import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ✅ QR public ผ่านตลอด
  if (pathname.startsWith("/qr")) {
    return NextResponse.next()
  }

  const token =
    req.cookies.get("accessToken")?.value ||
    req.headers.get("cookie")?.includes("accessToken")

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login", "/qr/:path*"],
}