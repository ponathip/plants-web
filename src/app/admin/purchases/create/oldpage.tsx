"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { useGarden } from "@/context/GardenContext"
import { toastError, toastSuccess } from "@/lib/toast"
import { useRouter } from 'next/navigation';

type Species = {
  id: number
  name: string
}

type Supplier = {
  id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  line_id?: string;
  facebook?: string;
  address?: string;
  note?: string;
  status?: "active" | "inactive";
};

type PurchaseItem = {
  plant_species_id: string
  plant_variety_id: string
  item_type: "cutting" | "air_layer" | "potted"
  quantity: number
  unit_price: number
  line_total: number
  note: string
  images: File[]
}

type PurchaseForm = {
  supplier_id: number,
  supplier_name: string
  contact_link: string
  order_link: string
  channel: string
  payment_method: string
  payment_detail: string
  items_total: number
  shipping_cost: number
  grand_total: number
  purchase_date: string
  received_date: string
  note: string
  slip_image: File | null
  purchase_images: File[]
  items: PurchaseItem[]
}

const emptyItem = (): PurchaseItem => ({
  plant_species_id: "",
  plant_variety_id: "",
  item_type: "cutting",
  quantity: 1,
  unit_price: 0,
  line_total: 0,
  note: "",
  images: [],
})

export default function PurchaseCreatePage() {
//   const { gardenId } = useGarden()
  const gardenId = 1
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [varieties, setVarieties] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<PurchaseForm>({
    supplier_id: 0,
    supplier_name: "",
    contact_link: "",
    order_link: "",
    channel: "",
    payment_method: "",
    payment_detail: "",
    items_total: 0,
    shipping_cost: 0,
    grand_total: 0,
    purchase_date: new Date().toISOString().slice(0, 16),
    received_date: "",
    note: "",
    slip_image: null,
    purchase_images: [],
    items: [emptyItem()],
  })
  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    const loadSpecies = async () => {
      try {
        const res = await api("/species")
        setSpecies(Array.isArray(res) ? res : [])
      } catch (err) {
        console.error(err)
      }
    }

    loadSpecies()
  }, [])

  useEffect(() => {
    const itemsTotal = form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unit_price || 0)
    }, 0)

    const grandTotal = itemsTotal + Number(form.shipping_cost || 0)

    setForm((prev) => ({
      ...prev,
      items_total: itemsTotal,
      grand_total: grandTotal,
      items: prev.items.map((item) => ({
        ...item,
        line_total: Number(item.quantity || 0) * Number(item.unit_price || 0),
      })),
    }))
  }, [form.shipping_cost, form.items.map(i => `${i.quantity}-${i.unit_price}`).join("|")])

  const openUploadWidget = (onSuccess: (url: string, publicId: string) => void) => {
    const widget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: "plants_purchases",
        sources: ["local", "camera"],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 2000000,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        resourceType: "image",
        folder: "plant/purchases",
      },
      (error: any, result: any) => {
        if (!error && result.event === "success") {
          onSuccess(result.info.secure_url, result.info.public_id)
        }
      }
    )

    widget.open()
  }
  
  const loadOptions = async () => {
    try {
      setLoadingOptions(true);

      const supplierData = await api("/suppliers/suppliers?status=active&limit=1000");
      setSuppliers(Array.isArray(supplierData) ? supplierData : supplierData.data || []);
    } catch (err: any) {
      toastError(err.message || "โหลด supplier ไม่สำเร็จ");
    } finally {
      setLoadingOptions(false);
    }
  };

  // const handleSupplierChange = (value: string) => {
  //   const supplier =
  //     suppliers.find((s) => String(s.id) === String(value)) || null;
  // };

  const totalQty = useMemo(() => {
    return form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  }, [form.items])

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(form.supplier_id)) || null;
  }, [suppliers, form.supplier_id]);

  const updateField = <K extends keyof PurchaseForm>(key: K, value: PurchaseForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateItem = <K extends keyof PurchaseItem>(
    index: number,
    key: K,
    value: PurchaseItem[K]
  ) => {
    setForm((prev) => {
      const next = [...prev.items]
      next[index] = {
        ...next[index],
        [key]: value,
      }
      next[index].line_total =
        Number(next[index].quantity || 0) * Number(next[index].unit_price || 0)

      return { ...prev, items: next }
    })
  }

  const loadVarieties = async (speciesId: string) => {
    const data = await api(`/plant-varieties/${speciesId}/varieties`)
    setVarieties(data)
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

  const onPurchaseImagesChange = (files: FileList | null) => {
    if (!files) return
    updateField("purchase_images", Array.from(files))
  }

  const onSlipChange = (files: FileList | null) => {
    if (!files?.[0]) return
    updateField("slip_image", files[0])
  }

  const onItemImagesChange = (index: number, files: FileList | null) => {
    if (!files) return
    updateItem(index, "images", Array.from(files))
  }

  const validateForm = () => {
    if (!gardenId) {
      toastError("ยังไม่ได้เลือกสวน")
      return false
    }

    if (!form.supplier_id) {
      return toastError("กรุณาเลือก supplier หรือกรอกชื่อ supplier");
    }

    // if (!form.supplier_name.trim()) {
    //   toastError("กรอกชื่อผู้ขาย")
    //   return false
    // }

    if (form.items.length === 0) {
      toastError("ต้องมีรายการอย่างน้อย 1 รายการ")
      return false
    }

    for (const item of form.items) {
      if (!item.plant_species_id) {
        toastError("กรุณาเลือกสายพันธุ์ให้ครบทุกรายการ")
        return false
      }
      if (Number(item.quantity) <= 0) {
        toastError("จำนวนต้องมากกว่า 0")
        return false
      }
    }

    return true
  }

  const savePurchase = async () => {
        if (!validateForm()) {
            toastError("ยังไม่ได้เลือกสวน")
            return
        }

        // if (!form.supplier_name.trim()) {
        //     toastError("กรอกชื่อผู้ขาย")
        //     return
        // }

        if (!form.items.length) {
            toastError("ต้องมีรายการอย่างน้อย 1 รายการ")
            return
        }

        setLoading(true)

        try {
            const fd = new FormData()
            fd.append("supplier_id", String(form.supplier_id || ""))
            fd.append("supplier_name", form.supplier_name)
            fd.append("contact_link", form.contact_link)
            fd.append("order_link", form.order_link)
            fd.append("channel", form.channel)
            fd.append("payment_method", form.payment_method)
            fd.append("payment_detail", form.payment_detail)
            fd.append("shipping_cost", String(form.shipping_cost || 0))
            fd.append("purchase_date", form.purchase_date)
            fd.append("received_date", form.received_date || "")
            fd.append("note", form.note || "")

            fd.append(
            "items",
            JSON.stringify(
                form.items.map((item) => ({
                plant_species_id: Number(item.plant_species_id),
                plant_variety_id: item.plant_variety_id ? Number(item.plant_variety_id) : null,
                item_type: item.item_type,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                note: item.note || "",
                }))
            )
            )

            if (form.slip_image) {
              fd.append("slip_image", form.slip_image)
            }

            for (const img of form.purchase_images) {
              fd.append("purchase_images", img)
            }

            for (let index = 0; index < form.items.length; index++) {
              const item = form.items[index]

              for (const img of item.images) {
                fd.append(`item_images_${index}`, img)
              }
            }

            await api(`purchases/${gardenId}/purchases`, {
            method: "POST",
            credentials: "include",
            body: fd,
            })

            toastSuccess("บันทึกการซื้อสำเร็จ")
            router.replace("/admin/purchases")
        } catch (err: any) {
            toastError(err.message || "บันทึกไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🛒 เพิ่มรายการซื้อเข้า</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border p-4">
          <h2 className="font-semibold">ข้อมูลบิลซื้อ</h2>

          {/* <div className="space-y-1">
            <label className="text-sm font-medium">ชื่อผู้ขาย</label>
            <input
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              value={form.supplier_name}
              onChange={(e) => updateField("supplier_name", e.target.value)}
              placeholder="ชื่อผู้ขาย"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">ลิงก์ติดต่อผู้ขาย</label>
            <input
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              value={form.contact_link}
              onChange={(e) => updateField("contact_link", e.target.value)}
              placeholder="https://..."
            />
          </div> */}
          <div className="space-y-1">
            <label className="text-sm font-medium">เลือก Supplier</label>
            <select
              value={form.supplier_id}
              onChange={(e) => updateField("supplier_id", Number(e.target.value))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
            >
              <option value="">เลือก supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        {/* 
          {!form.supplier_id && (
            <div className="space-y-1">
              <label className="text-sm font-medium">ชื่อ Supplier (กรณียังไม่มีในระบบ)</label>
              <input
                value={form.supplier_name}
                onChange={(e) =>
                  setForm({ ...form, supplier_name: e.target.value })
                }
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
              />
            </div>
          )} */}

          {selectedSupplier && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-sm space-y-1">
              <div><span className="font-medium">ชื่อ:</span> {selectedSupplier.name}</div>
              <div><span className="font-medium">ผู้ติดต่อ:</span> {selectedSupplier.contact_name || "-"}</div>
              <div><span className="font-medium">เบอร์โทร:</span> {selectedSupplier.phone || "-"}</div>
              <div><span className="font-medium">Line:</span> {selectedSupplier.line_id || "-"}</div>
              <div><span className="font-medium">Facebook:</span> {selectedSupplier.facebook || "-"}</div>
              <div><span className="font-medium">ที่อยู่:</span> {selectedSupplier.address || "-"}</div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">ลิงก์ข้อมูลการซื้อ</label>
            <input
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              value={form.order_link}
              onChange={(e) => updateField("order_link", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">ช่องทางซื้อขาย</label>
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
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">รายละเอียดการชำระเงิน</label>
            <input
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              value={form.payment_detail}
              onChange={(e) => updateField("payment_detail", e.target.value)}
              placeholder="เลขบัญชี / ชื่อบัญชี / พร้อมเพย์"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">วันเวลาซื้อ</label>
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                value={form.purchase_date}
                onChange={(e) => updateField("purchase_date", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">วันที่ได้รับ</label>
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                value={form.received_date}
                onChange={(e) => updateField("received_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">ค่าส่ง</label>
            <input
              type="number"
              min="0"
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              value={form.shipping_cost}
              onChange={(e) => updateField("shipping_cost", Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">รูปสลิป</label>
            <input
              type="file"
              accept="image/*"
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              onChange={(e) => onSlipChange(e.target.files)}
            />
            {form.slip_image && (
              <p className="text-sm text-gray-500">{form.slip_image.name}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">รูปหลักฐานการซื้อ</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
              onChange={(e) => onPurchaseImagesChange(e.target.files)}
            />
            {form.purchase_images.length > 0 && (
              <p className="text-sm text-gray-500">
                เลือกแล้ว {form.purchase_images.length} รูป
              </p>
            )}
          </div>

          <div className="space-y-1">
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

        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">รายการพืช</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-2 rounded bg-green-600 text-white"
            >
              + เพิ่มรายการ
            </button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div
                key={index}
                className="border rounded-xl p-4 space-y-3 bg-white dark:bg-gray-900"
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
                  <label className="text-sm font-medium">กลุ่มพืช</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={item.plant_species_id}
                    onChange={(e) => {
                        updateItem(index, "plant_species_id", e.target.value)
                        updateItem(index, "plant_variety_id", "")
                        loadVarieties(e.target.value)
                    }}
                  >
                    <option value="">เลือกกลุ่มพืช</option>
                    {species.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">สายพันธุ์</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={item.plant_variety_id}
                    onChange={(e) => updateItem(index, "plant_variety_id", e.target.value)}
                    >
                    <option value="">เลือกสายพันธุ์</option>
                    {varieties.map((v: any) => (
                        <option key={v.id} value={v.id}>
                        {v.name}
                        </option>
                    ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">ประเภท</label>
                    <select
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={item.item_type}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "item_type",
                          e.target.value as PurchaseItem["item_type"]
                        )
                      }
                    >
                      <option value="cutting">กิ่งสด</option>
                      <option value="air_layer">กิ่งตอน</option>
                      <option value="potted">ต้นกระถาง</option>
                    </select>
                  </div>

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
                    <label className="text-sm font-medium">ราคาต่อหน่วย</label>
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
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">รูปรายการนี้</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    onChange={(e) => onItemImagesChange(index, e.target.files)}
                  />
                  {item.images.length > 0 && (
                    <p className="text-sm text-gray-500">
                      เลือกแล้ว {item.images.length} รูป
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">หมายเหตุรายการ</label>
                  <input
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={item.note}
                    onChange={(e) => updateItem(index, "note", e.target.value)}
                    placeholder="เช่น ใบสวย / กิ่งใหญ่ / มีรากแล้ว"
                  />
                </div>

                <div className="text-right text-sm text-gray-500">
                  ราคารวมรายการ: {item.line_total.toLocaleString()} บาท
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
        <h2 className="font-semibold mb-4">สรุปยอด</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="border rounded p-3">
            <p className="text-gray-500">จำนวนรวม</p>
            <p className="text-lg font-semibold">{totalQty}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-gray-500">ค่าสินค้ารวม</p>
            <p className="text-lg font-semibold">
              {form.items_total.toLocaleString()}
            </p>
          </div>
          <div className="border rounded p-3">
            <p className="text-gray-500">ค่าส่ง</p>
            <p className="text-lg font-semibold">
              {Number(form.shipping_cost).toLocaleString()}
            </p>
          </div>
          <div className="border rounded p-3">
            <p className="text-gray-500">ยอดรวมสุทธิ</p>
            <p className="text-lg font-semibold text-green-600">
              {form.grand_total.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded border"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={savePurchase}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-700 text-white disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกการซื้อ"}
        </button>
      </div>
    </div>
  )
}