"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Dialog } from "@headlessui/react"

type PlantData = {
  id: number
  name?: string | null
  display_name?: string | null
  status?: "alive" | "sold" | "dead" | string
  acquired_at?: string | null
  last_update_at?: string | null
  image_url?: string | null
  species_name?: string | null
  plant_variety_name?: string | null
  supplier_name?: string | null
  cost_per_unit?: number | string | null
}

type TimelineItem = {
  id: number
  title: string
  description?: string | null
  image_url?: string | null
  event_date: string
  event_type?: string
}

export default function PlantQrPage() {
  const params = useParams()
  const token = params?.token as string

  const [plant, setPlant] = useState<PlantData | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [openModal, setOpenModal] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [timelineForm, setTimelineForm] = useState({
    title: "",
    description: "",
    event_date: new Date().toISOString().slice(0, 16),
  })

  const loadPlant = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await api(`/plants/qr/${token}`)

      setPlant(data.plant || null)
      setTimeline(Array.isArray(data.timeline) ? data.timeline : [])
    } catch (err: any) {
      setError(err.message || "โหลดข้อมูลไม่สำเร็จ")
      setPlant(null)
      setTimeline([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadPlant()
  }, [token])

  const uploadImage = async () => {
    if (!imageFile) return null

    const fd = new FormData()
    fd.append("file", imageFile)

    const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plant-timelines/upload/image`, {
      method: "POST",
      body: fd,
      credentials: "include",
    })
    return data.url || null
  }

  const createTimeline = async () => {
    try {
      if (!plant?.id) {
        setError("ไม่พบข้อมูลต้นพืช")
        return
      }

      if (!timelineForm.title.trim()) {
        setError("กรุณากรอกหัวข้อ")
        return
      }

      if (!timelineForm.event_date) {
        setError("กรุณาเลือกวันที่")
        return
      }

      setSaving(true)
      setError("")

      const imageUrl = await uploadImage()

      await api("/plant-timelines", {
        method: "POST",
        body: JSON.stringify({
          plant_id: plant.id,
          title: timelineForm.title,
          description: timelineForm.description || null,
          image_url: imageUrl,
          event_date: timelineForm.event_date,
        }),
      })

      setOpenModal(false)
      setTimelineForm({
        title: "",
        description: "",
        event_date: new Date().toISOString().slice(0, 16),
      })
      setImageFile(null)
      setImagePreview(null)

      await loadPlant()
    } catch (err: any) {
      setError(err.message || "บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (status: "alive" | "dead") => {
    try {
      setSaving(true)
      setError("")

      await api(`/plants/qr/${token}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })

      await loadPlant()
    } catch (err: any) {
      setError(err.message || "อัปเดตสถานะไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  const getAgeText = (acquiredAt?: string | null) => {
    if (!acquiredAt) return "-"

    const start = new Date(acquiredAt)
    const now = new Date()

    if (isNaN(start.getTime())) return "-"

    let years = now.getFullYear() - start.getFullYear()
    let months = now.getMonth() - start.getMonth()
    let days = now.getDate() - start.getDate()

    if (days < 0) {
      months -= 1
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      days += prevMonth.getDate()
    }

    if (months < 0) {
      years -= 1
      months += 12
    }

    if (years > 0) return `${years} ปี ${months} เดือน`
    if (months > 0) return `${months} เดือน ${days} วัน`
    return `${Math.max(days, 0)} วัน`
  }

  const getStatusLabel = (status?: string) => {
    if (status === "alive") return "ยังมีชีวิต"
    if (status === "dead") return "ตายแล้ว"
    if (status === "sold") return "ขายแล้ว"
    return status || "-"
  }

  const getStatusClass = (status?: string) => {
    if (status === "alive") return "bg-green-100 text-green-800"
    if (status === "dead") return "bg-red-100 text-red-800"
    if (status === "sold") return "bg-blue-100 text-blue-800"
    return "bg-gray-100 text-gray-800"
  }

  const displayName =
    plant?.display_name || plant?.name || plant?.plant_variety_name || "-"

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-xl mx-auto bg-white text-gray-900 rounded-2xl shadow p-6">
          กำลังโหลด...
        </div>
      </div>
    )
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-xl mx-auto bg-white text-gray-900 rounded-2xl  shadow p-6">
          <div className="text-red-600 font-medium">ไม่พบข้อมูล</div>
          {error && <div className="mt-2 text-sm text-gray-600">{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-xl mx-auto space-y-4 ">
        {(timeline[0]?.image_url || plant.image_url) && (
          <img
            src={timeline[0]?.image_url || plant.image_url || ""}
            alt={displayName}
            className="w-full h-72 object-cover rounded-2xl shadow"
          />
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold">🌱 {displayName}</h1>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                plant.status
              )}`}
            >
              {getStatusLabel(plant.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">ชนิดพืช:</span>{" "}
              <span className="font-medium">{plant.species_name || "-"}</span>
            </div>

            <div>
              <span className="text-gray-500">อายุ:</span>{" "}
              <span className="font-medium">{getAgeText(plant.acquired_at)}</span>
            </div>

            <div>
              <span className="text-gray-500">วันที่รับเข้า:</span>{" "}
              <span className="font-medium">
                {plant.acquired_at
                  ? new Date(plant.acquired_at).toLocaleDateString("th-TH")
                  : "-"}
              </span>
            </div>

            <div>
              <span className="text-gray-500">อัปเดตล่าสุด:</span>{" "}
              <span className="font-medium">
                {plant.last_update_at
                  ? new Date(plant.last_update_at).toLocaleDateString("th-TH")
                  : "-"}
              </span>
            </div>

            {/* <div>
              <span className="text-gray-500">ต้นทุน:</span>{" "}
              <span className="font-medium">
                {Number(plant.cost_per_unit || 0).toLocaleString()} บาท
              </span>
            </div> */}

            {/* <div>
              <span className="text-gray-500">ผู้ขาย:</span>{" "}
              <span className="font-medium">{plant.supplier_name || "-"}</span>
            </div> */}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-semibold">อัปเดตสถานะต้น</h2>

          <button
            disabled={saving || plant.status === "alive"}
            onClick={() => updateStatus("alive")}
            className="w-full px-4 py-3 rounded-xl bg-green-600 text-white disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "ยังมีชีวิต"}
          </button>

          <button
            disabled={saving || plant.status === "dead"}
            onClick={() => updateStatus("dead")}
            className="w-full px-4 py-3 rounded-xl bg-red-600 text-white disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "ตายแล้ว"}
          </button>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="w-full bg-green-600 text-white p-3 rounded-2xl shadow hover:bg-green-700"
        >
          ➕ เพิ่มการอัปเดต
        </button>

        {error && (
          <div className="bg-white text-red-600 p-4 rounded-2xl shadow text-sm">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-semibold text-lg">📈 การเติบโต</h2>

          {timeline.length === 0 && (
            <div className="text-gray-500">ยังไม่มีการอัปเดต</div>
          )}

          {timeline.map((t) => (
            <div key={t.id} className="border-l-2 border-green-500 pl-4">
              <div className="text-xs text-gray-400">
                {new Date(t.event_date).toLocaleDateString("th-TH")}
              </div>

              <div className="font-medium mt-1">{t.title}</div>

              {t.description && (
                <div className="text-sm text-gray-700 mt-1">{t.description}</div>
              )}

              {t.image_url && (
                <img
                  src={t.image_url}
                  alt={t.title}
                  className="mt-3 rounded-xl border border-gray-200"
                />
              )}
            </div>
          ))}
        </div>

        {openModal && (
  <Dialog
    open={openModal}
    onClose={() => setOpenModal(false)}
    className="relative z-50"
  >
    {/* overlay */}
    <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

    {/* container */}
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-gray-900 dark:bg-gray-900 p-5 space-y-3 shadow-xl">

        <Dialog.Title className="text-lg font-semibold">
          เพิ่มการอัปเดต
        </Dialog.Title>

        <input
          placeholder="หัวข้อ"
          value={timelineForm.title}
          onChange={(e) =>
            setTimelineForm({ ...timelineForm, title: e.target.value })
          }
          className="w-full border border-gray-300 p-2 rounded"
        />

        <textarea
          placeholder="รายละเอียด"
          value={timelineForm.description}
          onChange={(e) =>
            setTimelineForm({
              ...timelineForm,
              description: e.target.value,
            })
          }
          className="w-full border border-gray-300 p-2 rounded"
          rows={4}
        />

        <input
          type="datetime-local"
          value={timelineForm.event_date}
          onChange={(e) =>
            setTimelineForm({
              ...timelineForm,
              event_date: e.target.value,
            })
          }
          className="w-full border border-gray-300 p-2 rounded"
        />

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
          }}
        />

        {imagePreview && (
          <img src={imagePreview} className="rounded" />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpenModal(false)}
            className="px-4 py-2 border rounded"
          >
            ยกเลิก
          </button>

          <button
            onClick={createTimeline}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>

      </Dialog.Panel>
    </div>
  </Dialog>
)}
      </div>
    </div>
  )
}