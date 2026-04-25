"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useProtect } from "@/components/Protected";
import PermissionGate from "@/components/PermissionGate";
import { useUser } from "@/context/UserContext";
import { toastError, toastSuccess } from "@/lib/toast";

type Plant = {
  id: number;
  garden_id?: number;
  garden_name?: string;
  display_name?: string;
  name?: string;
  plant_code?: string;
  status?: string;
  source_type?: string;
  supplier_name?: string;
  cost_per_unit?: number;
  acquired_at?: string;
  propagation_type?: string;
  rootstock_variety_name?: string;
  zone_name?: string;
  location_name?: string;
  age_value?: number;
  age_unit?: string;
  height_cm?: number;
  trunk_diameter_mm?: number;
  pot_size_inch?: number;
  image_url?: string;
  source_note?: string;
};

type TimelineItem = {
  id: number;
  event_type: string;
  event_date: string;
  title: string;
  description?: string;
  old_status?: string;
  new_status?: string;
  old_zone_name?: string;
  new_zone_name?: string;
  old_location_name?: string;
  new_location_name?: string;
  height_cm?: number;
  trunk_diameter_mm?: number;
  pot_size_inch?: number;
  age_value?: number;
  age_unit?: string;
  image_url?: string;
};

type PurchaseImage = {
  id: number
  purchase_id: number
  purchase_item_id: number | null
  image_url: string
  image_type: "seller_post" | "seller_chat" | "slip" | "received" | "other"
  note: string | null
}

type PurchaseItem = {
  id: number;
  species_name?: string | null;
  variety_name?: string | null;
  item_type?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  cost_per_unit?: number | null;
  note?: string | null;
};

type PurchaseItemImage = {
  id: number;
  purchase_id: number;
  purchase_item_id: number | null;
  image_url: string;
  image_type?: string | null;
  note?: string | null;
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("th-TH");
}

function formatNumber(value?: number) {
  if (value === undefined || value === null) return "-";
  return Number(value).toLocaleString("th-TH");
}

export default function PlantDetailPage() {
  // useProtect("plant.view");

  const params = useParams();
  const id = params?.id;

  const { user, loadingUser } = useUser();
  const isSuper = user?.role === "super";

  const [plant, setPlant] = useState<Plant | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [image_url, setNoteImage] = useState("");
  const [image_public_id, setNoteImagePublicId] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [purchaseItem, setPurchaseItem] = useState<PurchaseItem | null>(null);
  const [purchaseItemImages, setPurchaseItemImages] = useState<PurchaseItemImage[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [openingUpload, setOpeningUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [plantData, timelineData] = await Promise.all([
        api(`/plants/${id}`),
        api(`/plant-timelines/${id}/timeline`),
      ]);

      setPlant(plantData.plant  || null);
      setTimeline(Array.isArray(timelineData) ? timelineData : timelineData.data || []);
      setPurchaseItem(plantData.purchase_item || null);
      setPurchaseItemImages(
        Array.isArray(plantData.purchase_item_images) ? plantData.purchase_item_images : []
      );
    } catch (err: any) {
      setError(err.message || "โหลดข้อมูลต้นพืชไม่สำเร็จ");
      setPlant(null);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const handleAddNote = async () => {
    if (!noteTitle.trim()) return;

    try {
      setSavingNote(true);

      await api(`/plant-timelines/${id}/timeline`, {
        method: "POST",
        body: JSON.stringify({
          title: noteTitle.trim(),
          description: noteDescription || null,
          image_url: image_url || null,
          image_public_id: image_public_id || null,
        }),
      });

      toastSuccess("เพิ่มบันทึกสำเร็จ");
      setNoteTitle("");
      setNoteDescription("");
      setNoteImage("");
      setNoteImagePublicId("");
      await loadData();
    } catch (err: any) {
      toastError(err.message || "เพิ่มบันทึกไม่สำเร็จ");
    } finally {
      setSavingNote(false);
    }
  };

  const openUploadWidget = () => {
    if (openingUpload || uploadingImage) return;

    if (!(window as any).cloudinary) {
      alert("Cloudinary not loaded");
      return;
    }

    setOpeningUpload(true);

    const widget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: "plants_timeline",
        sources: ["local", "camera"],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 3000000,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        resourceType: "image",
        folder: "plants/timeline",
      },
      (error: any, result: any) => {
        if (result?.event === "display-changed") {
          setOpeningUpload(false);
        }

        if (result?.event === "upload-added") {
          setUploadingImage(true);
        }

        if (!error && result?.event === "success") {
          setOpeningUpload(false);
          setUploadingImage(false);

          const url = result.info.secure_url;
          const publicId = result.info.public_id;

          setNoteImage(url);
          setNoteImagePublicId(publicId)
        }

        if (result?.event === "close") {
          setOpeningUpload(false);
          setUploadingImage(false);
        }

        if (error) {
          setOpeningUpload(false);
          setUploadingImage(false);
        }
      }
    );

    widget.open();
  };

  const getImageSrc = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${url}`;
  };

  const statusLabel: Record<string, string> = useMemo(
    () => ({
      alive: "ปกติ",
      sold: "ขายแล้ว",
      dead: "ตาย",
    }),
    []
  );

  const sourceLabel: Record<string, string> = useMemo(
    () => ({
      purchase: "ซื้อมา",
      propagation: "ขยายพันธุ์",
      unknown: "ไม่ระบุ",
    }),
    []
  );

  const propagationLabel: Record<string, string> = useMemo(
    () => ({
      air_layer: "กิ่งตอน",
      cutting: "ปักชำ",
      grafting: "เสียบยอด",
      budding: "ติดตา",
      seed: "เพาะเมล็ด",
      other: "อื่นๆ",
    }),
    []
  );

  const imageLabel: Record<string, string> = useMemo(
    () => ({
      seller_post: "โพสต์",
      seller_chat: "แชท",
      slip: "สลิป",
      received: "ได้รับ",
      other: "อื่นๆ",
    }),
    []
  );

  if (loadingUser) {
    return <div className="p-6">กำลังโหลดข้อมูลผู้ใช้...</div>;
  }

  if (loading) {
    return <div className="p-6">กำลังโหลด...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (!plant) {
    return <div className="p-6 text-red-500">ไม่พบข้อมูลต้นพืช</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h1 className="text-2xl font-bold">
          {plant.display_name || plant.name || "-"}
        </h1>

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

        <div className="mt-2 text-sm text-gray-500 space-y-1">
          <div>รหัสต้น: {plant.plant_code || "-"}</div>
          {isSuper && <div>สวน: {plant.garden_name || "-"}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
          <h2 className="font-semibold">ข้อมูลหลัก</h2>
          <div>สถานะ: {statusLabel[plant.status || ""] || plant.status || "-"}</div>
          <div>วันที่รับเข้า: {formatDateTime(plant.acquired_at)}</div>
          <div>ต้นทุน: {formatNumber(plant.cost_per_unit)} บาท</div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
          <h2 className="font-semibold">ที่มา</h2>
          <div>
            ที่มา: {sourceLabel[plant.source_type || ""] || plant.source_type || "-"}
          </div>
          <div>ผู้ขาย: {plant.supplier_name || "-"}</div>
          <div>หมายเหตุ: {plant.source_note || "-"}</div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
          <h2 className="font-semibold">การขยายพันธุ์</h2>
          <div>
            วิธีขยายพันธุ์:{" "}
            {propagationLabel[plant.propagation_type || ""] ||
              plant.propagation_type ||
              "-"}
          </div>
          <div>พันธุ์ต้นตอ: {plant.rootstock_variety_name || "-"}</div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
          <h2 className="font-semibold">ข้อมูลเพิ่มเติม</h2>
          <div>โซน: {plant.zone_name || "-"}</div>
          <div>ตำแหน่ง: {plant.location_name || "-"}</div>
          <div>
            อายุ: {plant.age_value || "-"} {plant.age_unit || ""}
          </div>
          <div>สูง: {plant.height_cm || "-"} ซม.</div>
          <div>ลำต้น: {plant.trunk_diameter_mm || "-"} มม.</div>
          <div>กระถาง: {plant.pot_size_inch || "-"} นิ้ว</div>

          {plant.image_url && (
            <img
              src={plant.image_url}
              alt={plant.display_name || "plant"}
              className="mt-3 rounded-lg border max-h-64 object-cover"
            />
          )}
        </section>
      </div>

      {purchaseItemImages.length > 0 && (
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="font-semibold">รูปจากรายการซื้อ</h2>

        {purchaseItem && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">ชนิดพืช:</span>{" "}
              <span className="font-medium">{purchaseItem.species_name || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">สายพันธุ์:</span>{" "}
              <span className="font-medium">{purchaseItem.variety_name || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">ประเภท:</span>{" "}
              <span className="font-medium">{purchaseItem.item_type || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">จำนวน:</span>{" "}
              <span className="font-medium">{purchaseItem.quantity || "-"}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {purchaseItemImages.map((img) => (
            <div
              key={img.id}
              className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800"
            >
              <img
                src={getImageSrc(img.image_url)}
                onClick={() => setPreviewImage(getImageSrc(img.image_url))}
                alt={`purchase-item-${img.id}`}
                className="w-full h-40 object-cover cursor-pointer hover:opacity-80"
              />
              <div className="p-2 text-xs text-gray-500">
                { imageLabel[img.image_type] || "image"}
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

      <PermissionGate perm="plant.update">
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-semibold mb-4">เพิ่มบันทึก Timeline</h2>

          <div className="space-y-3">
            <input
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
              placeholder="หัวข้อ"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
            <textarea
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
              rows={3}
              placeholder="รายละเอียด"
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
            />

            {image_url && (
              <img
                src={image_url}
                  alt="preview"
                  className="rounded-lg border"
              />
            )}

            <button
                  type="button"
                  onClick={openUploadWidget}
                  disabled={openingUpload || uploadingImage}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(openingUpload || uploadingImage) && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>
                    {openingUpload
                      ? "กำลังเปิดหน้าต่างอัปโหลด..."
                      : uploadingImage
                      ? "กำลังอัปโหลดรูป..."
                      : "📷 เลือกรูป / ถ่ายรูป"}
                  </span>
            </button>

            <div className="flex justify-end">
              <button
                onClick={handleAddNote}
                disabled={savingNote || !noteTitle.trim()}
                className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white disabled:opacity-50"
              >
                {savingNote ? "กำลังบันทึก..." : "เพิ่มบันทึก"}
              </button>
            </div>
          </div>
        </section>
      </PermissionGate>

      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h2 className="font-semibold mb-4">Timeline การเติบโต</h2>

        <div className="space-y-4">
          {timeline.length === 0 && (
            <div className="text-gray-500">ยังไม่มี timeline</div>
          )}

          {timeline.map((item) => (
            <div key={item.id} className="border-l-4 border-green-600 pl-4 py-1">
              <div className="text-xs text-gray-500">
                {formatDateTime(item.event_date)}
              </div>

              <div className="font-medium mt-1">{item.title}</div>

              {item.description && (
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {item.description}
                </div>
              )}

              {item.event_type === "status_changed" && (
                <div className="text-sm text-gray-600 mt-1">
                  จาก {statusLabel[item.old_status || ""] || item.old_status || "-"} →{" "}
                  {statusLabel[item.new_status || ""] || item.new_status || "-"}
                </div>
              )}

              {item.event_type === "moved" && (
                <div className="text-sm text-gray-600 mt-1">
                  โซน: {item.old_zone_name || "-"} → {item.new_zone_name || "-"}
                  <br />
                  ตำแหน่ง: {item.old_location_name || "-"} →{" "}
                  {item.new_location_name || "-"}
                </div>
              )}

              {item.event_type === "measured" && (
                <div className="text-sm text-gray-600 mt-1">
                  สูง {item.height_cm || "-"} ซม. / ลำต้น{" "}
                  {item.trunk_diameter_mm || "-"} มม. / กระถาง{" "}
                  {item.pot_size_inch || "-"} นิ้ว
                </div>
              )}

              {item.image_url && (
                <img
                  src={getImageSrc(item.image_url)}
                  onClick={() => setPreviewImage(getImageSrc(item.image_url))}
                  alt={item.title}
                  className="mt-3 rounded-lg border max-h-48 object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}