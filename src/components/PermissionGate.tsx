"use client"

import { ReactNode } from "react"
import { usePermission } from "@/context/PermissionContext"

export default function PermissionGate({
  perm,
  children,
  fallback = null,
}: {
  perm: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { can, loadingPermission } = usePermission()

  if (loadingPermission) return null
  if (!can(perm)) return <>{fallback}</>

  return <>{children}</>
}