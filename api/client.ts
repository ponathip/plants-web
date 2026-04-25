// src/api/client.ts
import type { paths } from './schema'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export async function apiFetch<
  P extends keyof paths,
  M extends keyof paths[P]
>(
  path: P,
  method: M,
  options?: {
    params?: paths[P][M] extends { parameters: { path: infer T } } ? T : never
    body?: paths[P][M] extends { requestBody: infer B }
      ? B extends { content: { 'application/json': infer J } }
        ? J
        : never
      : never
    token?: string
  }
): Promise<
  paths[P][M] extends { responses: { 200: infer R } }
    ? R extends { content: { 'application/json': infer J } }
      ? J
      : unknown
    : unknown
> {
  let url = BASE_URL + path

  // path params
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url = url.replace(`{${k}}`, String(v))
    }
  }

  const res = await fetch(url, {
    method: method as string,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token && { Authorization: `Bearer ${options.token}` })
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  return res.json()
}
