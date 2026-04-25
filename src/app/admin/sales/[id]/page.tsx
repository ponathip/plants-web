"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { useUser } from "@/context/UserContext"
import { useGarden } from "@/context/GardenContext"
import { useRouter } from "next/navigation"
import { toastError, toastSuccess } from "@/lib/toast"

type Sale = {
  id: number
  buyer_name: string | null
  sale_link: string | null
  channel: string | null
  payment_method: string | null
  payment_detail: string | null
  items_total: number
  shipping_fee: number
  grand_total: number
  sold_at: string | null
  slip_image_url: string | null
  note: string | null
}

type SaleItem = {
  id: number
  plant_id: number
  quantity: number
  unit_price: number
  line_total: number
  cost_per_unit_snapshot: number
  cost_total_snapshot: number
  profit_total: number
  note: string | null
  plant_name: string | null
  plant_status: string | null
}

type SaleImage = {
  id: number
  image_url: string
  image_type: string
  note: string | null
}

type UploadedImage = {
  url: string
  public_id: string
}

export default function SaleDetailPage() {
  const { gardenId } = useGarden()
  const { user, loadingUser } = useUser()
  const permissions = user?.permissions || []
  const isSuper = user?.role === "super"
  const params = useParams()
  const saleId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [images, setImages] = useState<SaleImage[]>([])

  const [newSlipImage, setNewSlipImage] = useState<UploadedImage | null>(null)
  const [newSaleImages, setNewSaleImages] = useState<UploadedImage[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const canViewSale =
  isSuper || permissions.includes("sale.view") || permissions.includes("sale.manage")

  const canEditSale =
    isSuper || permissions.includes("sale.update") || permissions.includes("sale.manage")

  const canDeleteSale =
    isSuper || permissions.includes("sale.delete") || permissions.includes("sale.manage")

  const canUploadImages =
    isSuper || permissions.includes("sale_image.create") || permissions.includes("sale.manage")

  const canDeleteImage =
    isSuper || permissions.includes("sale_image.delete") || permissions.includes("sale.manage")

  const router = useRouter()

    const [editingSale, setEditingSale] = useState(false)

    const [saleForm, setSaleForm] = useState({
    buyer_name: "",
    sale_link: "",
    channel: "",
    payment_method: "",
    payment_detail: "",
    shipping_fee: 0,
    sold_at: "",
    note: "",
    })

  const loadDetail = async () => {
    if (!saleId) return

    setLoading(true)
    try {
      const res = await api(`/sale/sales/${saleId}`)
      setSale(res.sale || null)
      setItems(res.items || [])
      setImages(res.images || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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

  const uploadMoreImages = async () => {
    if (!canUploadImages) {
      toastError("คุณไม่มีสิทธิ์อัปโหลดรูป")
      return
    }

    if (!newSlipImage && newSaleImages.length === 0) {
      toastError("กรุณาเลือกรูปก่อน")
      return
    }

    setUploadingImages(true)
    try {
      await api(`/sale/sales/${saleId}/images`, {
        method: "POST",
        body: JSON.stringify({
          slip_image_url: newSlipImage?.url || null,
          slip_image_public_id: newSlipImage?.public_id || null,
          sale_images: newSaleImages,
        }),
      })

      setNewSlipImage(null)
      setNewSaleImages([])
      toastSuccess("อัปโหลดรูปสำเร็จ")
      await loadDetail()
    } catch (err: any) {
      toastError(err.message || "อัปโหลดรูปไม่สำเร็จ")
    } finally {
      setUploadingImages(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [saleId])

  useEffect(() => {
  if (!sale) return

  setSaleForm({
        buyer_name: sale.buyer_name || "",
        sale_link: sale.sale_link || "",
        channel: sale.channel || "",
        payment_method: sale.payment_method || "",
        payment_detail: sale.payment_detail || "",
        shipping_fee: Number(sale.shipping_fee || 0),
        sold_at: sale.sold_at
        ? new Date(sale.sold_at).toISOString().slice(0, 16)
        : "",
        note: sale.note || "",
    })
  }, [sale])

  const totalProfit = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.profit_total || 0), 0)
  }, [items])

  const saveSaleEdit = async () => {
    // if (!gardenId || !saleId) return

    try {
        await api(`/sale/sales/${saleId}`, {
        method: "PATCH",
        body: JSON.stringify({
            buyer_name: saleForm.buyer_name,
            sale_link: saleForm.sale_link,
            channel: saleForm.channel,
            payment_method: saleForm.payment_method,
            payment_detail: saleForm.payment_detail,
            shipping_fee: Number(saleForm.shipping_fee || 0),
            sold_at: saleForm.sold_at || null,
            note: saleForm.note,
        }),
        })

        toastSuccess("แก้ไขรายการขายสำเร็จ")
        await loadDetail()
        setEditingSale(false)
    } catch (err: any) {
        toastError(err.message || "แก้ไขไม่สำเร็จ")
    }
  }

  const handleDeleteSale = async () => {
    // if (!gardenId || !saleId) return

    const ok = window.confirm("ยืนยันลบรายการขายนี้ใช่ไหม? ระบบจะคืนสถานะต้นพืชกลับเป็น alive")
    if (!ok) return

    try {
        await api(`/sale/sales/${saleId}`, {
        method: "DELETE",
        })

        toastSuccess("ลบรายการขายสำเร็จ")
        router.replace("/admin/sales")
    } catch (err: any) {
        toastError(err.message || "ลบไม่สำเร็จ")
    }
  }

      const handleDeleteImage = async (imageId: number) => {
      if (!gardenId || !saleId) return

      const ok = window.confirm("ยืนยันลบรูปนี้ใช่ไหม?")
      if (!ok) return

      try {
        await api(`/sale/sales/${saleId}/images/${imageId}`, {
          method: "DELETE",
        })

        toastSuccess("ลบรูปสำเร็จ")
        await loadDetail()
      } catch (err: any) {
        toastError(err.message || "ลบรูปไม่สำเร็จ")
      }
    }

  if (loading) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <div>กำลังโหลด...</div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <div className="text-red-500">ไม่พบรายการขาย</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">💰 รายละเอียดการขาย #{sale.id}</h1>

        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => setEditingSale((v) => !v)}
                className="px-4 py-2 rounded-lg border"
                >
                {editingSale ? "ยกเลิก" : "แก้ไข"}
            </button>

            <button
                type="button"
                onClick={handleDeleteSale}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
                >
                ลบรายการขาย
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">ข้อมูลการขาย</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">ผู้ซื้อ</p>
                {editingSale ? (
                    <input
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    value={saleForm.buyer_name}
                    onChange={(e) =>
                        setSaleForm((prev) => ({ ...prev, buyer_name: e.target.value }))
                    }
                    />
                ) : (
                    <p className="font-medium">{sale.buyer_name || "-"}</p>
                )}
              </div>

              <div>
                <p className="text-gray-500">ช่องทางขาย</p>
                <p className="font-medium">{sale.channel || "-"}</p>
              </div>

              <div>
                <p className="text-gray-500">การชำระเงิน</p>
                <p className="font-medium">{sale.payment_method || "-"}</p>
              </div>

              <div>
                <p className="text-gray-500">รายละเอียดการชำระเงิน</p>
                <p className="font-medium break-all">{sale.payment_detail || "-"}</p>
              </div>

              <div>
                <p className="text-gray-500">วันเวลาขาย</p>
                {editingSale ? (
                    <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    value={saleForm.sold_at}
                    onChange={(e) =>
                        setSaleForm((prev) => ({ ...prev, sold_at: e.target.value }))
                    }
                    />
                ) : (
                    <p className="font-medium">
                    {sale.sold_at ? new Date(sale.sold_at).toLocaleString() : "-"}
                    </p>
                )}
                </div>

                <div>
                <p className="text-gray-500">ค่าส่ง</p>
                {editingSale ? (
                    <input
                    type="number"
                    min="0"
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    value={saleForm.shipping_fee}
                    onChange={(e) =>
                        setSaleForm((prev) => ({
                        ...prev,
                        shipping_fee: Number(e.target.value),
                        }))
                    }
                    />
                ) : (
                    <p className="font-medium">
                    {Number(sale.shipping_fee || 0).toLocaleString()} บาท
                    </p>
                )}
                </div>

              <div>
                <p className="text-gray-500">ลิงก์ข้อมูลการขาย</p>
                {sale.sale_link ? (
                  <a
                    href={sale.sale_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    {sale.sale_link}
                  </a>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </div>

            <div className="mt-4">
                <p className="text-gray-500 text-sm">หมายเหตุ</p>
                {editingSale ? (
                    <textarea
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    rows={4}
                    value={saleForm.note}
                    onChange={(e) =>
                        setSaleForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    />
                ) : (
                    <p className="mt-1">{sale.note || "-"}</p>
                )}
            </div>

            {editingSale && (
            <div className="mt-4 flex justify-end">
                <button
                onClick={saveSaleEdit}
                className="px-4 py-2 rounded bg-green-700 text-white"
                >
                บันทึกการแก้ไข
                </button>
            </div>
            )}
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">รายการที่ขาย</h2>

            <div className="space-y-3">
              {items.length === 0 && (
                <div className="text-sm text-gray-500">ไม่มีรายการขาย</div>
              )}

              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">รายการที่ {index + 1}</h3>
                    <span className="text-xs text-gray-500">
                      plant #{item.plant_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">ชื่อต้นพืช</p>
                      <p className="font-medium">{item.plant_name || "-"}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">สถานะต้นพืช</p>
                      <p className="font-medium">{item.plant_status || "-"}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">จำนวน</p>
                      <p className="font-medium">{item.quantity}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">ราคาขายต่อหน่วย</p>
                      <p className="font-medium">
                        {Number(item.unit_price || 0).toLocaleString()} บาท
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">ยอดขายรวมรายการ</p>
                      <p className="font-medium text-green-600">
                        {Number(item.line_total || 0).toLocaleString()} บาท
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">ต้นทุนต่อหน่วย</p>
                      <p className="font-medium">
                        {Number(item.cost_per_unit_snapshot || 0).toLocaleString()} บาท
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">ต้นทุนรวม</p>
                      <p className="font-medium">
                        {Number(item.cost_total_snapshot || 0).toLocaleString()} บาท
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">กำไรรวม</p>
                      <p className="font-medium text-blue-600">
                        {Number(item.profit_total || 0).toLocaleString()} บาท
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-gray-500 text-sm">หมายเหตุรายการ</p>
                    <p className="mt-1 text-sm">{item.note || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">รูปหลักฐานการขาย</h2>

            {images.length === 0 && (
              <div className="text-sm text-gray-500">ไม่มีรูปหลักฐาน</div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900"
                >
                  <img
                    src={`${img.image_url}`}
                    alt={`sale-${img.id}`}
                    className="w-full h-40 object-cover"
                    onClick={() =>
                      setPreviewImage(`${img.image_url}`)
                    }
                  />
                  <div className="p-2 text-xs text-gray-500">
                    {img.image_type}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">เพิ่มรูปภายหลัง</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">เปลี่ยน / เพิ่มสลิปโอน</label>
                <button
                  type="button"
                  onClick={() => openUploadWidget((img) => setNewSlipImage(img))}
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                >
                  อัปโหลดสลิป
                </button>
                {newSlipImage && <img src={newSlipImage.url} alt="slip" className="h-24 rounded border" />}
                {/* {newSlipImage && (
                  <p className="text-sm text-gray-500 mt-1">{newSlipImage.name}</p>
                )} */}
              </div>

              <div>
                <label className="text-sm font-medium">เพิ่มรูปหลักฐานการขาย</label>
                {/* <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 mt-1"
                  onChange={(e) => setNewSaleImages(Array.from(e.target.files || []))}
                /> */}
                <button
                  type="button"
                  onClick={() => openUploadWidget((img) => setNewSaleImages((prev) => [...prev, img]))}
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                >
                  เพิ่มรูปหลักฐานการขาย
                </button>
                {newSaleImages.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    เลือกแล้ว {newSaleImages.length} รูป
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={uploadMoreImages}
                  disabled={uploadingImages}
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  {uploadingImages ? "กำลังอัปโหลด..." : "อัปโหลดรูปเพิ่ม"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900"
              >
                <img
                  src={`${img.image_url}`}
                  alt={`sale-${img.id}`}
                  className="w-full h-40 object-cover"
                  onClick={() =>
                    setPreviewImage(`${img.image_url}`)
                  }
                />

                <div className="p-2 space-y-2">
                  <div className="text-xs text-gray-500">{img.image_type}</div>

                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="w-full px-3 py-1.5 rounded bg-red-600 text-white text-sm"
                  >
                    ลบรูป
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">สรุปยอด</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ค่าสินค้ารวม</span>
                <span>{Number(sale.items_total || 0).toLocaleString()} บาท</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">ค่าส่ง</span>
                <span>{Number(sale.shipping_fee || 0).toLocaleString()} บาท</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold text-green-600">
                <span>รวมสุทธิ</span>
                <span>{Number(sale.grand_total || 0).toLocaleString()} บาท</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold text-blue-600">
                <span>กำไรรวม</span>
                <span>{Number(totalProfit || 0).toLocaleString()} บาท</span>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">สลิปโอน</h2>

            {sale.slip_image_url ? (
              <img
                src={`${sale.slip_image_url}`}
                alt="sale-slip"
                className="w-full rounded-lg border"
              />
            ) : (
              <div className="text-sm text-gray-500">ไม่มีสลิป</div>
            )}
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