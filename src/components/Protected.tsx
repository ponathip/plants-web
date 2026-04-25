"use client"

import { usePermission } from "@/hooks/usePermission"
import { useUser } from "@/context/UserContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function useProtect(perm: string) {
  const { can, loadingPermission } = usePermission()
  const { user, loadingUser } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loadingUser || loadingPermission) return

    if (user?.role === "super") return

    if (!can(perm)) {
      router.replace("/403")
    }
  }, [loadingUser, loadingPermission, perm, user])
}