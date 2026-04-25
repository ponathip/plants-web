"use client"

import { createContext, useContext, useState, useEffect } from "react"

type GardenContextType = {
  gardenId: number | null
  setGardenId: (id: number) => void
}

const GardenContext = createContext<GardenContextType | null>(null)

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const [gardenId, setGardenId] = useState<number | null>(null)

  // 🔥 persist (จำสวนล่าสุด)
  useEffect(() => {
    const saved = localStorage.getItem("gardenId")
    if (saved) setGardenId(Number(saved))
  }, [])

  useEffect(() => {
    if (gardenId) {
      localStorage.setItem("gardenId", String(gardenId))
    }
  }, [gardenId])

  return (
    <GardenContext.Provider value={{ gardenId, setGardenId }}>
      {children}
    </GardenContext.Provider>
  )
}

export function useGarden() {
  const ctx = useContext(GardenContext)
  if (!ctx) throw new Error("useGarden must be used inside GardenProvider")
  return ctx
}