"use client"

import { useRouter } from "next/navigation"

export default function DashboardHeader() {
  const router = useRouter()

  const logout = () => {
    localStorage.removeItem("accessToken")
    router.replace("/login")
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <button
        onClick={logout}
        className="text-sm bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </header>
  )
}
