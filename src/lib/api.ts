const BASE = process.env.NEXT_PUBLIC_API_URL

let isRefreshing = false

async function rawFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as any),
  }

  if (options.body) {
    headers["Content-Type"] = "application/json"
  }

  return fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  })
}

export async function api(path: string, options: RequestInit = {}) {
  let res = await rawFetch(path, options)

  if (res.status !== 401) {
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || "API error")
    }
    return parseResponse(res)
  }

  if (isRefreshing) {
    throw new Error("SESSION_EXPIRED")
  }

  isRefreshing = true

  try {
    const refresh = await rawFetch("/auth/refresh", {
      method: "POST",
    })

    if (!refresh.ok) {
      // clear cookie ฝั่ง client ถ้ามี
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      throw new Error("SESSION_EXPIRED")
    }

    res = await rawFetch(path, options)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || "API error")
    }

    return parseResponse(res)
  } finally {
    isRefreshing = false
  }
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    return null
  }
  return res.json()
}