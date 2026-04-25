"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const acceptInvite = async () => {
    if (!token) {
      setStatus("error")
      setMessage("ไม่พบ token คำเชิญ")
      return
    }

    setLoading(true)
    setStatus("idle")
    setMessage("")

    try {
      const res = await api(`/members/accept-invite`, {
        method: "POST",
        body: JSON.stringify({ token }),
      })

      setStatus("success")
      setMessage(res?.message || "เข้าร่วมสวนสำเร็จ")
    } catch (err: any) {
      setStatus("error")
      setMessage(err.message || "รับคำเชิญไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("ไม่พบ token คำเชิญ")
    }
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">🌱 รับคำเชิญเข้าร่วมสวน</h1>
          <p className="text-sm text-gray-500 mt-1">
            กดยืนยันเพื่อเข้าร่วมสวนจากลิงก์คำเชิญนี้
          </p>
        </div>

        {status === "success" && (
          <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 p-4">
            {message}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">
            {message}
          </div>
        )}

        <div className="rounded-xl border p-4 bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-500 break-all">
            token: {token || "-"}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/members")}
            className="px-4 py-2 rounded border"
          >
            กลับ
          </button>

          <button
            type="button"
            onClick={acceptInvite}
            disabled={loading || !token || status === "success"}
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? "กำลังยืนยัน..." : "ยืนยันเข้าร่วมสวน"}
          </button>
        </div>
      </div>
    </div>
  )
}