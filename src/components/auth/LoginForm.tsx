"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      // const res = await fetch("http://localhost:3001/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify({ username, password }),
      // })

      if (!res.ok) {
        throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
      }
      const data = await res.json()

      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      if (res.ok) {
        window.location.href = "/dashboard"
      }
          } catch (err: any) {
            setError(err.message)
          } finally {
            setLoading(false)
          }
        }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4"
    >
      <h1 className="text-2xl font-bold text-center">Login</h1>

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      <input
        className="w-full border px-3 py-2 rounded"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <input
        type="password"
        className="w-full border px-3 py-2 rounded"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  )
}
