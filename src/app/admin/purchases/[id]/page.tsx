"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { useGarden } from "@/context/GardenContext";
import { useUser } from "@/context/UserContext";
import Script from "next/script";

type UploadedImage = {
  url: string;
  public_id: string;
};

type PurchaseItemImage = {
  id: number;
  image_url: string;
  image_type: string;
  purchase_item_id: number | null;
  image_public_id?: string | null;
};

type Purchase = {
  id: number;
  supplier_name: string | null;
  order_link: string | null;
  channel: string | null;
  payment_method: string | null;
  payment_detail: string | null;
  items_total: number;
  shipping_cost: number;
  grand_total: number;
  purchase_date: string | null;
  received_date: string | null;
  slip_image_url: string | null;
  slip_image_public_id?: string | null;
  note: string | null;
};

type PurchaseItem = {
  id: number;
  plant_species_id: number | null;
  plant_variety_id: number | null;
  species_name: string | null;
  variety_name: string | null;
  item_type: "cutting" | "air_layer" | "potted";
  quantity: number;
  unit_price: number;
  line_total: number;
  shipping_allocated: number;
  cost_total: number;
  cost_per_unit: number;
  note: string | null;
  images: PurchaseItemImage[];
};

type PurchaseImage = {
  id: number;
  purchase_id: number;
  purchase_item_id: number | null;
  image_url: string;
  image_type: "seller_post" | "seller_chat" | "slip" | "received" | "other";
  note: string | null;
  image_public_id?: string | null;
};

const openUploadWidget = (onSuccess: (img: UploadedImage) => void) => {
  if (!(window as any).cloudinary) {
    alert("Cloudinary not loaded");
    return;
  }

  const cloudinary = (window as any).cloudinary;

  if (!cloudinary) {
    alert("Cloudinary ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่");
    return;
  }

  const widget = (window as any).cloudinary.createUploadWidget(
    {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dk7hhxcwn",
      uploadPreset: "plants_purchases",
      sources: ["local", "camera"],
      multiple: false,
      maxFiles: 1,
      maxFileSize: 5000000,
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
      resourceType: "image",
      folder: "plant/purchases",
    },
    (error: any, result: any) => {
      if (error) {
        console.error("Cloudinary upload error:", error);
        alert("อัปโหลดรูปไม่สำเร็จ");
        return;
      }

      if (!error && result?.event === "success") {
        onSuccess({
          url: result.info.secure_url,
          public_id: result.info.public_id,
        });
      }
    },
  );

  if (!widget) {
    alert("ไม่สามารถเปิดหน้าต่างอัปโหลดได้");
    return;
  }

  widget.open();
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const { gardenId } = useGarden();
  const { user, loadingUser } = useUser();

  const purchaseId = params?.id as string;
  const permissions = user?.permissions || [];

  const isSuper = user?.role === "super";

  const canEditPurchase =
    isSuper ||
    permissions.includes("purchase.update") ||
    permissions.includes("purchase.manage");

  const canEditItems =
    isSuper ||
    permissions.includes("purchase_item.update") ||
    permissions.includes("purchase.manage");

  const canUploadImages =
    isSuper ||
    permissions.includes("purchase_image.create") ||
    permissions.includes("purchase.manage");

  const canGeneratePlants =
    isSuper ||
    permissions.includes("plant.create") ||
    permissions.includes("purchase_item.generate_plants") ||
    permissions.includes("purchase.manage");

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [images, setImages] = useState<PurchaseImage[]>([]);

  const [editingPurchase, setEditingPurchase] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [savingImages, setSavingImages] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    received_date: "",
    shipping_cost: 0,
    note: "",
    slip_image_url: null as string | null,
    slip_image_public_id: null as string | null,
  });

  const [itemForm, setItemForm] = useState<{
    [key: number]: {
      quantity: number;
      unit_price: number;
      note: string;
    };
  }>({});

  const [newPurchaseImages, setNewPurchaseImages] = useState<UploadedImage[]>(
    [],
  );
  const [newItemImages, setNewItemImages] = useState<{
    [key: number]: UploadedImage[];
  }>({});

  const loadDetail = async () => {
    if (!purchaseId) return;

    setLoading(true);
    try {
      const res = await api(`/purchases/${purchaseId}`);
      setPurchase(res.purchase || null);
      setItems(res.items || []);
      setImages(res.images || []);
    } catch (err: any) {
      console.error(err);
      toastError(err.message || "โหลดรายละเอียดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadingUser) return;
    loadDetail();
  }, [purchaseId, loadingUser]);

  useEffect(() => {
    if (!purchase) return;

    setPurchaseForm({
      received_date: purchase.received_date
        ? new Date(purchase.received_date).toISOString().slice(0, 16)
        : "",
      shipping_cost: Number(purchase.shipping_cost || 0),
      note: purchase.note || "",
      slip_image_url: purchase.slip_image_url || null,
      slip_image_public_id: purchase.slip_image_public_id || null,
    });
  }, [purchase]);

  useEffect(() => {
    if (!items.length) return;

    const next: Record<
      number,
      { quantity: number; unit_price: number; note: string }
    > = {};
    for (const item of items) {
      next[item.id] = {
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        note: item.note || "",
      };
    }
    setItemForm(next);
  }, [items]);

  const purchaseImages = useMemo(() => {
    return images.filter((img) => img.purchase_item_id === null);
  }, [images]);

  const savePurchaseEdit = async () => {
    if (!canEditPurchase) {
      toastError("คุณไม่มีสิทธิ์แก้ไขข้อมูลการซื้อ");
      return;
    }

    try {
      await api(`/purchases/${purchaseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          received_date: purchaseForm.received_date || null,
          shipping_cost: Number(purchaseForm.shipping_cost || 0),
          note: purchaseForm.note,
          slip_image_url: purchaseForm.slip_image_url,
          slip_image_public_id: purchaseForm.slip_image_public_id,
        }),
      });

      await loadDetail();
      setEditingPurchase(false);
      toastSuccess("บันทึกการแก้ไขสำเร็จ");
    } catch (err: any) {
      console.error(err);
      toastError(err.message || "บันทึกไม่สำเร็จ");
    }
  };

  const saveItemEdit = async (itemId: number) => {
    if (!canEditItems) {
      toastError("คุณไม่มีสิทธิ์แก้ไขรายการ");
      return;
    }

    try {
      await api(`/purchases/${purchaseId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity: Number(itemForm[itemId]?.quantity || 0),
          unit_price: Number(itemForm[itemId]?.unit_price || 0),
          note: itemForm[itemId]?.note || "",
        }),
      });

      await loadDetail();
      setEditingItemId(null);
      toastSuccess("บันทึกรายการสำเร็จ");
    } catch (err: any) {
      console.error(err);
      toastError(err.message || "บันทึกรายการไม่สำเร็จ");
    }
  };

  const uploadMoreImages = async () => {
    if (!canUploadImages) {
      toastError("คุณไม่มีสิทธิ์อัปโหลดรูป");
      return;
    }

    try {
      setSavingImages(true);

      await api(`/purchases/${purchaseId}/images`, {
        method: "POST",
        body: JSON.stringify({
          slip_image_url: purchaseForm.slip_image_url,
          slip_image_public_id: purchaseForm.slip_image_public_id,
          purchase_images: newPurchaseImages,
          item_images: newItemImages,
        }),
      });

      setNewPurchaseImages([]);
      setNewItemImages({});
      await loadDetail();
      toastSuccess("เพิ่มรูปสำเร็จ");
    } catch (err: any) {
      console.error(err);
      toastError(err.message || "เพิ่มรูปไม่สำเร็จ");
    } finally {
      setSavingImages(false);
    }
  };

  const handleGeneratePlants = async (purchaseItemId: number) => {
    if (!canGeneratePlants) {
      toastError("คุณไม่มีสิทธิ์สร้างรายการต้นไม้");
      return;
    }

    const ok = confirm("ต้องการสร้างรายการต้นไม้จากรายการนี้หรือไม่?");
    if (!ok) return;

    try {
      await api(`/purchase-items/${purchaseItemId}/generate-plants`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      toastSuccess("สร้าง plants สำเร็จ");
      await loadDetail();
    } catch (err: any) {
      toastError(err.message || "สร้าง plants ไม่สำเร็จ");
    }
  };

  const typeLabel = (type: PurchaseItem["item_type"]) => {
    if (type === "cutting") return "กิ่งสด";
    if (type === "air_layer") return "กิ่งตอน";
    if (type === "potted") return "ต้นกระถาง";
    return type;
  };

  if (loading || loadingUser) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <div>กำลังโหลด...</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <div className="text-red-500">ไม่พบรายการซื้อ</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="afterInteractive"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          🛒 รายละเอียดการซื้อ #{purchase.id}
        </h1>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">ข้อมูลบิลซื้อ</h2>

              {canEditPurchase && (
                <button
                  type="button"
                  onClick={() => setEditingPurchase((v) => !v)}
                  className="px-3 py-1 rounded border"
                >
                  {editingPurchase ? "ยกเลิก" : "แก้ไข"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">ผู้ขาย</p>
                <p className="font-medium">{purchase.supplier_name || "-"}</p>
              </div>

              <div>
                <p className="text-gray-500">ช่องทางซื้อ</p>
                <p className="font-medium">{purchase.channel || "-"}</p>
              </div>

              <div>
                <p className="text-gray-500">การชำระเงิน</p>
                <p className="font-medium">{purchase.payment_method || "-"}</p>
              </div>

              <div>
                <p className="text-gray-500">รายละเอียดการชำระเงิน</p>
                <p className="font-medium break-all">
                  {purchase.payment_detail || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">วันเวลาซื้อ</p>
                <p className="font-medium">
                  {purchase.purchase_date
                    ? new Date(purchase.purchase_date).toLocaleString()
                    : "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">วันที่ได้รับ</p>
                {editingPurchase ? (
                  <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    value={purchaseForm.received_date}
                    onChange={(e) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        received_date: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="font-medium">
                    {purchase.received_date
                      ? new Date(purchase.received_date).toLocaleString()
                      : "-"}
                  </p>
                )}
              </div>

              <div>
                <p className="text-gray-500">ค่าส่ง</p>
                {editingPurchase ? (
                  <input
                    type="number"
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                    value={purchaseForm.shipping_cost}
                    onChange={(e) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        shipping_cost: Number(e.target.value),
                      }))
                    }
                  />
                ) : (
                  <p className="font-medium">
                    {Number(purchase.shipping_cost || 0).toLocaleString()} บาท
                  </p>
                )}
              </div>

              <div>
                <p className="text-gray-500">ลิงก์คำสั่งซื้อ</p>
                {purchase.order_link ? (
                  <a
                    href={purchase.order_link}
                    target="_blank"
                    className="text-blue-600 break-all underline"
                    rel="noreferrer"
                  >
                    {purchase.order_link}
                  </a>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-gray-500 text-sm">หมายเหตุ</p>
              {editingPurchase ? (
                <textarea
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900"
                  rows={4}
                  value={purchaseForm.note}
                  onChange={(e) =>
                    setPurchaseForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              ) : (
                <p className="mt-1">{purchase.note || "-"}</p>
              )}
            </div>

            {canUploadImages && (
              <div className="border rounded-xl p-4 bg-white dark:bg-gray-800 mt-6">
                <h2 className="font-semibold mb-4">เพิ่มรูปภายหลัง</h2>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      เปลี่ยน/เพิ่มสลิป
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openUploadWidget((img) =>
                          setPurchaseForm((prev) => ({
                            ...prev,
                            slip_image_url: img.url,
                            slip_image_public_id: img.public_id,
                          })),
                        )
                      }
                      className="px-3 py-2 rounded bg-blue-600 text-white"
                    >
                      อัปโหลดสลิป
                    </button>

                    {purchaseForm.slip_image_url && (
                      <img
                        src={purchaseForm.slip_image_url}
                        onClick={() =>
                          setPreviewImage(purchaseForm.slip_image_url)
                        }
                        alt="slip-preview"
                        className="w-auto h-40 object-cover cursor-pointer hover:opacity-80"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      รูปหลักฐานระดับบิล
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openUploadWidget((img) =>
                          setNewPurchaseImages((prev) => [...prev, img]),
                        )
                      }
                      className="px-3 py-2 rounded bg-blue-600 text-white"
                    >
                      เพิ่มรูปหลักฐาน
                    </button>

                    {newPurchaseImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {newPurchaseImages.map((img, index) => (
                          <div
                            key={`${img.public_id}-${index}`}
                            className="relative"
                          >
                            <img
                              src={img.url}
                              alt={`purchase-new-${index}`}
                              className="h-24 w-full object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setNewPurchaseImages((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              className="absolute top-1 right-1 rounded bg-red-600 px-2 py-1 text-xs text-white"
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={uploadMoreImages}
                      disabled={savingImages}
                      className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                    >
                      {savingImages ? "กำลังบันทึก..." : "บันทึกรูปเพิ่ม"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editingPurchase && canEditPurchase && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={savePurchaseEdit}
                  className="px-4 py-2 rounded bg-green-700 text-white"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            )}
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">รายการพืช</h2>

            <div className="space-y-3">
              {items.length === 0 && (
                <div className="text-gray-500 text-sm">ไม่มีรายการ</div>
              )}

              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="font-medium">รายการที่ {index + 1}</h3>

                    <div className="flex gap-2 flex-wrap">
                      {canEditItems && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingItemId((prev) =>
                              prev === item.id ? null : item.id,
                            )
                          }
                          className="px-3 py-1 rounded border"
                        >
                          {editingItemId === item.id ? "ยกเลิก" : "แก้ไขรายการ"}
                        </button>
                      )}

                      {canGeneratePlants && (
                        <button
                          onClick={() => handleGeneratePlants(item.id)}
                          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          สร้างรายการต้นไม้
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">ชนิดพืช</p>
                      <p className="font-medium">{item.species_name || "-"}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">ประเภท</p>
                      <p className="font-medium">{typeLabel(item.item_type)}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">สายพันธุ์</p>
                      <p className="font-medium">{item.variety_name || "-"}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">จำนวน</p>
                      {editingItemId === item.id ? (
                        <input
                          type="number"
                          min="1"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={itemForm[item.id]?.quantity ?? item.quantity}
                          onChange={(e) =>
                            setItemForm((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                quantity: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      ) : (
                        <p className="font-medium">{item.quantity}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500">ราคาต่อหน่วย</p>
                      {editingItemId === item.id ? (
                        <input
                          type="number"
                          min="0"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={
                            itemForm[item.id]?.unit_price ?? item.unit_price
                          }
                          onChange={(e) =>
                            setItemForm((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                unit_price: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      ) : (
                        <p className="font-medium">
                          {Number(item.unit_price || 0).toLocaleString()} บาท
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500">รวมรายการ</p>
                      <p className="font-medium text-green-600">
                        {Number(item.line_total || 0).toLocaleString()} บาท
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-gray-500 text-sm">หมายเหตุรายการ</p>
                    {editingItemId === item.id ? (
                      <input
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={itemForm[item.id]?.note ?? item.note ?? ""}
                        onChange={(e) =>
                          setItemForm((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              note: e.target.value,
                            },
                          }))
                        }
                      />
                    ) : (
                      <p className="mt-1 text-sm">{item.note || "-"}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                    <div>
                      <p className="text-gray-500">ค่าส่งที่กระจาย</p>
                      <p className="font-medium">
                        {Number(item.shipping_allocated || 0).toLocaleString()}{" "}
                        บาท
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">ต้นทุนรวมรายการ</p>
                      <p className="font-medium text-green-600">
                        {Number(item.cost_total || 0).toLocaleString()} บาท
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">ต้นทุนต่อหน่วย</p>
                      <p className="font-medium text-blue-600">
                        {Number(item.cost_per_unit || 0).toLocaleString()} บาท
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-gray-500 text-sm mb-2">
                      รูปของรายการนี้
                    </p>

                    {item.images?.length ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {item.images.map((img) => (
                          <div
                            key={img.id}
                            className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800"
                          >
                            <img
                              src={img.image_url}
                              alt={`item-${item.id}-${img.id}`}
                              className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                              onClick={() => setPreviewImage(img.image_url)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        ไม่มีรูปของรายการนี้
                      </div>
                    )}
                  </div>

                  {canUploadImages && (
                    <div className="mt-4 space-y-2">
                      <label className="text-sm font-medium">
                        เพิ่มรูปของรายการนี้
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          openUploadWidget((img) =>
                            setNewItemImages((prev) => ({
                              ...prev,
                              [item.id]: [...(prev[item.id] || []), img],
                            })),
                          )
                        }
                        className="px-3 py-2 rounded bg-blue-600 text-white"
                      >
                        เพิ่มรูป
                      </button>

                      {(newItemImages[item.id] || []).length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                          {(newItemImages[item.id] || []).map(
                            (img, imgIndex) => (
                              <div
                                key={`${img.public_id}-${imgIndex}`}
                                className="relative"
                              >
                                <img
                                  src={img.url}
                                  alt={`item-new-${item.id}-${imgIndex}`}
                                  className="h-24 w-full object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewItemImages((prev) => ({
                                      ...prev,
                                      [item.id]: (prev[item.id] || []).filter(
                                        (_, i) => i !== imgIndex,
                                      ),
                                    }))
                                  }
                                  className="absolute top-1 right-1 rounded bg-red-600 px-2 py-1 text-xs text-white"
                                >
                                  ลบ
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {editingItemId === item.id && canEditItems && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => saveItemEdit(item.id)}
                        className="px-4 py-2 rounded bg-green-700 text-white"
                      >
                        บันทึกรายการ
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">รูปหลักฐานการซื้อ</h2>

            {purchaseImages.length === 0 && (
              <div className="text-gray-500 text-sm">ไม่มีรูปหลักฐาน</div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {purchaseImages.map((img) => (
                <div
                  key={img.id}
                  className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900"
                >
                  <img
                    src={img.image_url}
                    alt={`purchase-${img.id}`}
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(img.image_url)}
                  />
                  <div className="p-2 text-xs text-gray-500">
                    {img.image_type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">สรุปยอด</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ค่าสินค้ารวม</span>
                <span>
                  {Number(purchase.items_total || 0).toLocaleString()} บาท
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">ค่าส่ง</span>
                <span>
                  {Number(purchase.shipping_cost || 0).toLocaleString()} บาท
                </span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold text-green-600">
                <span>รวมสุทธิ</span>
                <span>
                  {Number(purchase.grand_total || 0).toLocaleString()} บาท
                </span>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4">สลิปโอน</h2>

            {purchaseForm.slip_image_url ? (
              <img
                src={purchaseForm.slip_image_url}
                alt="slip"
                className="w-full rounded-lg border cursor-pointer"
                onClick={() => setPreviewImage(purchaseForm.slip_image_url!)}
              />
            ) : (
              <div className="text-gray-500 text-sm">ไม่มีสลิป</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
