import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ success: true })

  // 🔥 ดึง cookie แบบ raw
  const setCookie = res.headers.get("set-cookie")
  if (setCookie) {
    const cookies = setCookie.split(/,(?=\s*\w+=)/)
    cookies.forEach((cookie) => {
      const clean = cookie.trim()
      response.headers.append("set-cookie", clean)
    })
  }

  return response
}