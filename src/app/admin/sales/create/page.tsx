"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useGarden } from "@/context/GardenContext"
import { toastError, toastSuccess } from "@/lib/toast"
import { useUser } from "@/context/UserContext"

type PlantOption = {
  id: number
  name: string | null
  status: string
  cost_per_unit: number
  species_name: string | null
  variety_name: string | null
}

type SaleItem = {
  plant_id: string
  quantity: number
  unit_price: number
  note: string
}

type SaleForm = {
  buyer_name: string
  sale_link: string
  channel: string
  payment_method: string
  payment_detail: string
  shipping_fee: number
  sold_at: string
  note: string
  items: SaleItem[]
}

const emptyItem = (): SaleItem => ({
  plant_id: "",
  quantity: 1,
  unit_price: 0,
  note: "",
})

type UploadedImage = {
  url: string
  public_id: string
}

type Garden = {
  id: number
  name: string
}

export default function SaleCreatePage() {
  const { gardenId } = useGarden()
  const { user, loadingUser } = useUser()
  const permissions = user?.permissions || []
  const isSuper = user?.role === "super"

  const canCreateSale =
  isSuper ||
  permissions.includes("sale.create") ||
  permissions.includes("sale.manage")

  const [loading, setLoading] = useState(false)
  const [plants, setPlants] = useState<PlantOption[]>([])

  const [slipImage, setSlipImage] = useState<UploadedImage | null>(null)
  const [saleImages, setSaleImages] = useState<UploadedImage[]>([])
  // const [saleImages, setSaleImages] = useState<File[]>([])
  const router = useRouter()
  const [gardens, setGardens] = useState<Garden[]>([])
  const [selectedGardenId, setSelectedGardenId] = useState("")

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const [form, setForm] = useState<SaleForm>({
    buyer_name: "",
    sale_link: "",
    channel: "",
    payment_method: "",
    payment_detail: "",
    shipping_fee: 0,
    sold_at: new Date().toISOString().slice(0, 16),
    note: "",
    items: [emptyItem()],
  })

  useEffect(() => {
    const loadPlants = async () => {
      const targetGardenId = isSuper ? selectedGardenId : String(gardenId || "")
      if (!targetGardenId) return

      try {
        const params = new URLSearchParams({
          garden_id: targetGardenId,
        })

        const res = await api(`/sale/plants/available-for-sale?${params.toString()}`)
        setPlants(Array.isArray(res) ? res : res.data || [])
      } catch (err) {
        console.error(err)
      }
    }

    if (loadingUser) return
    loadPlants()
  }, [loadingUser, isSuper, gardenId, selectedGardenId])

  useEffect(() => {
    if (loadingUser) return

    if (isSuper) {
      loadGardens()
    } else {
      setGardens([])
      setSelectedGardenId(String(gardenId || ""))
    }
  }, [loadingUser, isSuper, gardenId])

  const loadGardens = async () => {
    try {
      const res = await api("/gardens")
      setGardens(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      console.error("loadGardens error:", err)
    }
  }

  const openUploadWidget = (onSuccess: (img: UploadedImage) => void) => {
    if (!(window as any).cloudinary) {
      alert("Cloudinary not loaded")
      return
    }

    const widget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: "plants_sale",
        sources: ["local", "camera"],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 2000000,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        resourceType: "image",
        folder: "plant/sale",
      },
      (error: any, result: any) => {
        if (!error && result?.event === "success") {
          onSuccess({
            url: result.info.secure_url,
            public_id: result.info.public_id,
          })
        }
      }
    )

    widget.open()
  }

  const updateField = <K extends keyof SaleForm>(key: K, value: SaleForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateItem = <K extends keyof SaleItem>(
    index: number,
    key: K,
    value: SaleItem[K]
  ) => {
    setForm((prev) => {
      const next = [...prev.items]
      next[index] = {
        ...next[index],
        [key]: value,
      }
      return { ...prev, items: next }
    })
  }

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }))
  }

  const removeItem = (index: number) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }
    })
  }

  const itemsTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unit_price || 0)
    }, 0)
  }, [form.items])

  const grandTotal = useMemo(() => {
    return itemsTotal + Number(form.shipping_fee || 0)
  }, [itemsTotal, form.shipping_fee])

  const estimatedProfit = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const plant = plants.find((p) => p.id === Number(item.plant_id))
      const cost = Number(plant?.cost_per_unit || 0) * Number(item.quantity || 0)
      const sale = Number(item.unit_price || 0) * Number(item.quantity || 0)
      return sum + (sale - cost)
    }, 0)
  }, [form.items, plants])

  const validateForm = () => {
    const targetGardenId = isSuper ? selectedGardenId : String(gardenId || "")

    if (!targetGardenId) {
      toastError("ยังไม่ได้เลือกสวน")
      return false
    }

    if (!form.items.length) {
      toastError("ต้องมีรายการขายอย่างน้อย 1 รายการ")
      return false
    }

    const chosen = new Set<string>()

    for (const item of form.items) {
      if (!item.plant_id) {
        toastError("กรุณาเลือกต้นพืชให้ครบทุกรายการ")
        return false
      }

      if (chosen.has(item.plant_id)) {
        toastError("มีต้นพืชซ้ำในรายการขาย")
        return false
      }
      chosen.add(item.plant_id)

      if (Number(item.quantity) <= 0) {
        toastError("จำนวนต้องมากกว่า 0")
        return false
      }

      if (Number(item.unit_price) < 0) {
        toastError("ราคาขายต้องไม่ติดลบ")
        return false
      }
    }

    return true
  }

  // const saveSale = async () => {
  //   if (!validateForm()) return

  //   setLoading(true)
  //   try {
  //     const fd = new FormData()

  //     fd.append("buyer_name", form.buyer_name)
  //     fd.append("sale_link", form.sale_link)
  //     fd.append("channel", form.channel)
  //     fd.append("payment_method", form.payment_method)
  //     fd.append("payment_detail", form.payment_detail)
  //     fd.append("shipping_fee", String(form.shipping_fee || 0))
  //     fd.append("sold_at", form.sold_at)
  //     fd.append("note", form.note || "")

  //     fd.append(
  //       "items",
  //       JSON.stringify(
  //         form.items.map((item) => ({
  //           plant_id: Number(item.plant_id),
  //           quantity: Number(item.quantity || 1),
  //           unit_price: Number(item.unit_price || 0),
  //           note: item.note || "",
  //         }))
  //       )
  //     )

  //     if (slipImage) {
  //       fd.append("slip_image", slipImage)
  //     }

  //     for (const img of saleImages) {
  //       fd.append("sale_images", img)
  //     }

  //     const res = await fetch(`http://localhost:3001/gardens/${gardenId}/sales`, {
  //       method: "POST",
  //       credentials: "include",
  //       body: fd,
  //     })

  //     if (!res.ok) {
  //       const text = await res.text()
  //       throw new Error(text || "บันทึกการขายไม่สำเร็จ")
  //     }

  //     const result = await res.json()

  //     toastSuccess("บันทึกการขายสำเร็จ")
  //     router.replace(`/admin/sales/${result.saleId}`)
  //   } catch (err: any) {
  //     toastError(err.message || "บันทึกการขายไม่สำเร็จ")
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  const saveSale = async () => {
    if (!canCreateSale) {
      toastError("คุณไม่มีสิทธิ์สร้างรายการขาย")
      return
    }

    if (!validateForm()) return

    setLoading(true)
    try {
      const targetGardenId = isSuper ? selectedGardenId : String(gardenId || "")

      const payload = {
        garden_id: Number(targetGardenId),
        buyer_name: form.buyer_name,
        sale_link: form.sale_link,
        channel: form.channel,
        payment_method: form.payment_method,
        payment_detail: form.payment_detail,
        shipping_fee: Number(form.shipping_fee || 0),
        sold_at: form.sold_at,
        note: form.note || "",
        slip_image_url: slipImage?.url || null,
        slip_image_public_id: slipImage?.public_id || null,
        sale_images: saleImages,
        items: form.items.map((item) => ({
          plant_id: Number(item.plant_id),
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          note: item.note || "",
        })),
      }

      const result = await api(`/sale/sales`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      toastSuccess("บันทึกการขายสำเร็จ")
      router.replace(`/admin/sales/${result.saleId}`)
    } catch (err: any) {
      toastError(err.message || "บันทึกการขายไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">💰 เพิ่มรายการขาย</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">ข้อมูลการขาย</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isSuper && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">สวน *</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    value={selectedGardenId}
                    onChange={(e) => {
                      setSelectedGardenId(e.target.value)
                      setPlants([])
                      setForm((prev) => ({
                        ...prev,
                        items: [emptyItem()],
                      }))
                    }}
                  >
                    <option value="">เลือกสวน</option>
                    {gardens.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">ชื่อผู้ซื้อ</label>
                <input
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.buyer_name}
                  onChange={(e) => updateField("buyer_name", e.target.value)}
                  placeholder="ชื่อผู้ซื้อ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">ลิงก์ข้อมูลการขาย</label>
                <input
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.sale_link}
                  onChange={(e) => updateField("sale_link", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">ช่องทางขาย</label>
                <select
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.channel}
                  onChange={(e) => updateField("channel", e.target.value)}
                >
                  <option value="">เลือกช่องทาง</option>
                  <option value="facebook">facebook</option>
                  <option value="shopee">shopee</option>
                  <option value="tiktok">tiktok</option>
                  <option value="walk_in">รับเองที่บ้าน</option>
                  <option value="other">อื่น ๆ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">ช่องทางชำระเงิน</label>
                <select
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.payment_method}
                  onChange={(e) => updateField("payment_method", e.target.value)}
                >
                  <option value="">เลือกการชำระเงิน</option>
                  <option value="bank">ธนาคาร</option>
                  <option value="promptpay">พร้อมเพย์</option>
                  <option value="cash">เงินสด</option>
                  <option value="cod">เก็บเงินปลายทาง</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">รายละเอียดการชำระเงิน</label>
                <input
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.payment_detail}
                  onChange={(e) => updateField("payment_detail", e.target.value)}
                  placeholder="เลขบัญชี / พร้อมเพย์ / หมายเหตุ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">วันเวลาขาย</label>
                <input
                  type="datetime-local"
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.sold_at}
                  onChange={(e) => updateField("sold_at", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">ค่าส่ง</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  value={form.shipping_fee}
                  onChange={(e) => updateField("shipping_fee", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">สลิปโอน</label>
              {/* <input
                type="file"
                accept="image/"
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                onChange={(e) => setSlipImage(e.target.files?.[0] || null)}
              />
              {slipImage && (
                <p className="text-sm text-gray-500">{slipImage.name}</p>
              )} */}
              <button
                type="button"
                onClick={() => openUploadWidget((img) => setSlipImage(img))}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                อัปโหลดสลิป
              </button>

              {slipImage && <img src={slipImage.url} alt="slip" onClick={() =>
                setPreviewImage(`${slipImage.url}`)
              } className="w-full rounded-lg border" />}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">รูปหลักฐานการขาย</label>
              {/* <input
                type="file"
                multiple
                accept="image/"
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                onChange={(e) => setSaleImages(Array.from(e.target.files || []))}
              />
              {saleImages.length > 0 && (
                <p className="text-sm text-gray-500">
                  เลือกแล้ว {saleImages.length} รูป
                </p>
              )} */}
              <button
                type="button"
                onClick={() => openUploadWidget((img) => setSaleImages((prev) => [...prev, img]))}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                เพิ่มรูปหลักฐานการขาย
              </button>
            </div>

            <div className="space-y-1 mt-4">
              <label className="text-sm font-medium">หมายเหตุ</label>
              <textarea
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                rows={4}
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">รายการขาย</h2>

              <button
                type="button"
                onClick={addItem}
                className="px-3 py-2 rounded bg-green-600 text-white"
              >
                + เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-4">
              {form.items.map((item, index) => {
                const selectedPlant = plants.find(
                  (p) => p.id === Number(item.plant_id)
                )
                const estimatedCost =
                  Number(selectedPlant?.cost_per_unit || 0) * Number(item.quantity || 0)
                const saleLine =
                  Number(item.unit_price || 0) * Number(item.quantity || 0)
                const profit = saleLine - estimatedCost

                return (
                  <div
                    key={index}
                    className="border rounded-xl p-4 bg-white dark:bg-gray-900 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">รายการที่ {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600"
                      >
                        ลบ
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">เลือกต้นพืช</label>
                      <select
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={item.plant_id}
                        onChange={(e) => updateItem(index, "plant_id", e.target.value)}
                      >
                        <option value="">เลือกต้นพืช</option>
                        {plants.map((plant) => (
                          <option key={plant.id} value={plant.id}>
                            #{plant.id}{" "}
                            {plant.variety_name ||
                              plant.name ||
                              plant.species_name ||
                              "ไม่ระบุ"}
                            {" - "}
                            ต้นทุน {Number(plant.cost_per_unit || 0).toLocaleString()} บาท
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedPlant && (
                      <div className="text-sm text-gray-500">
                        ชนิด: {selectedPlant.species_name || "-"} / สายพันธุ์:{" "}
                        {selectedPlant.variety_name || "-"}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">จำนวน</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">ราคาขายต่อหน่วย</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(index, "unit_price", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">กำไรโดยประมาณ</label>
                        <div className="w-full border px-3 py-2 rounded bg-gray-50 dark:bg-gray-800">
                          {profit.toLocaleString()} บาท
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">หมายเหตุรายการ</label>
                      <input
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={item.note}
                        onChange={(e) => updateItem(index, "note", e.target.value)}
                        placeholder="เช่น ลูกค้าโอนแล้ว / นัดรับเอง"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">สรุปยอดขาย</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ค่าสินค้า</span>
                <span>{itemsTotal.toLocaleString()} บาท</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">ค่าส่ง</span>
                <span>{Number(form.shipping_fee || 0).toLocaleString()} บาท</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold text-green-600">
                <span>ยอดรวมสุทธิ</span>
                <span>{grandTotal.toLocaleString()} บาท</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold text-blue-600">
                <span>กำไรโดยประมาณ</span>
                <span>{estimatedProfit.toLocaleString()} บาท</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.replace("/admin/sales")}
              className="px-4 py-2 rounded border"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={saveSale}
              disabled={loading}
              className="px-4 py-2 rounded bg-green-700 text-white disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกการขาย"}
            </button>
          </div>
        </div>
      </div>
      {previewImage && (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setPreviewImage(null)}
        >
            <img
            src={previewImage}
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
    </div>
  )
}