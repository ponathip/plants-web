"use client"

import { useContext } from "react"
import { PermissionContext } from "@/context/PermissionContext"

export function usePermission() {
  const ctx = useContext(PermissionContext)

  if (!ctx) {
    throw new Error("usePermission must be used inside PermissionProvider")
  }

  return ctx
}