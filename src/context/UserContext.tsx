"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { usePathname } from "next/navigation"

type User = {
  userId: number
  role: string
  gardenId?: number | null
  permissions?: string[]
}

type UserContextType = {
  user: User | null
  loadingUser: boolean
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === "/login") {
      setLoadingUser(false)
      return
    }

    const load = async () => {
      try {
        // 🔥 endpoint ที่คุณต้องมี
        const res = await api("/auth/me")
        setUser(res)
      } catch (err) {
        const message = err instanceof Error ? err.message : ""
        if (message === "SESSION_EXPIRED") {
          setUser(null)
          return
        }
      } finally {
        setLoadingUser(false)
      }
    }

    load()
  }, [])

  return (
    <UserContext.Provider value={{ user, loadingUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)

  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider")
  }

  return ctx
}