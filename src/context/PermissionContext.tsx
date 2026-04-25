"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useGarden } from "@/context/GardenContext"
import { useUser } from "@/context/UserContext"
import { api } from "@/lib/api"

type PermissionContextType = {
  permissions: string[]
  can: (perm: string) => boolean
  loadingPermission: boolean
}

export const PermissionContext = createContext<PermissionContextType | null>(null)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loadingPermission, setLoadingPermission] = useState(false)

  const { gardenId } = useGarden()
  const { user, loadingUser } = useUser()

  useEffect(() => {
    if (loadingUser) return

    if (!user) {
      setPermissions([])
      return
    }

    if (user.role === "super") {
      setPermissions(["*"])
      return
    }

    if (!gardenId) {
      setPermissions([])
      return
    }

    const load = async () => {
      setLoadingPermission(true)
      try {
        const res = await api(`/gardens/${gardenId}/me/permissions`)
        setPermissions(Array.isArray(res) ? res : [])
      } catch (err) {
        console.error(err)
        setPermissions([])
      } finally {
        setLoadingPermission(false)
      }
    }

    load()
  }, [gardenId, user, loadingUser])

  const can = (perm: string) => {
    if (permissions.includes("*")) return true
    return permissions.includes(perm)
  }

  return (
    <PermissionContext.Provider
      value={{ permissions, can, loadingPermission }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission() {
  const ctx = useContext(PermissionContext)
  if (!ctx) throw new Error("usePermission must be used inside PermissionProvider")
  return ctx
}