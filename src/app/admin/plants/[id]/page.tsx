"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useProtect } from "@/components/Protected";
import PermissionGate from "@/components/PermissionGate";
import { useUser } from "@/context/UserContext";
import { toastError, toastSuccess } from "@/lib/toast";
import Script from "next/script";

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

type PlantGraft = {
  id: number;
  plant_id: number;
  graft_variety_id: number;
  graft_variety_name?: string;
  method: "grafting" | "budding" | "other";
  source_type: "purchase" | "own_garden" | "unknown";
  source_plant_id?: number | null;
  source_plant_name?: string | null;
  purchase_item_id?: number | null;
  position_name?: string | null;
  grafted_at?: string | null;
  status: "alive" | "failed" | "removed";
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
  const [purchaseItemImages, setPurchaseItemImages] = useState<
    PurchaseItemImage[]
  >([]);
  const [grafts, setGrafts] = useState<PlantGraft[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [openingUpload, setOpeningUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [openGraftModal, setOpenGraftModal] = useState(false);
  const [editingGraftId, setEditingGraftId] = useState<number | null>(null);
  const [graftForm, setGraftForm] = useState({
    graft_variety_id: "",
    method: "grafting",
    source_type: "unknown",
    source_plant_id: "",
    purchase_item_id: "",
    position_name: "",
    grafted_at: "",
    status: "alive",
    note: "",
  });

  const [sourcePlantOptions, setSourcePlantOptions] = useState<any[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);

  const [varieties, setVarieties] = useState<any[]>([]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [plantData, timelineData, graftData, varietyData, plantListData, purchaseItemData,] =
        await Promise.all([
          api(`/plants/${id}`),
          api(`/plant-timelines/${id}/timeline`),
          api(`/plants/${id}/grafts`),
          api("/plant-varieties"),
          api("/plants?limit=500"),
          api("/purchase-items"),
        ]);

      setPlant(plantData.plant || null);
      setTimeline(
        Array.isArray(timelineData) ? timelineData : timelineData.data || [],
      );
      setGrafts(Array.isArray(graftData) ? graftData : graftData.data || []);
      setVarieties(
        Array.isArray(varietyData) ? varietyData : varietyData.data || [],
      );
      setSourcePlantOptions(
        Array.isArray(plantListData) ? plantListData : plantListData.data || [],
      );

      setPurchaseItems(
        Array.isArray(purchaseItemData)
          ? purchaseItemData
          : purchaseItemData.data || [],
      );
      setPurchaseItem(plantData.purchase_item || null);
      setPurchaseItemImages(
        Array.isArray(plantData.purchase_item_images)
          ? plantData.purchase_item_images
          : [],
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

  const handleSaveGraft = async () => {
    if (!graftForm.graft_variety_id) {
      return toastError("กรุณาเลือกสายพันธุ์ยอด");
    }

    try {
      const url = editingGraftId
        ? `/plant-grafts/${editingGraftId}`
        : `/plants/${id}/grafts`;

      const method = editingGraftId ? "PUT" : "POST";

      await api(url, {
        method,
        body: JSON.stringify({
          graft_variety_id: graftForm.graft_variety_id,
          method: graftForm.method,
          source_type: graftForm.source_type,
          source_plant_id: graftForm.source_plant_id || null,
          purchase_item_id: graftForm.purchase_item_id || null,
          position_name: graftForm.position_name || null,
          grafted_at: graftForm.grafted_at || null,
          status: graftForm.status,
          note: graftForm.note || null,
        }),
      });

      toastSuccess("เพิ่มยอดสำเร็จ");
      setOpenGraftModal(false);
      setEditingGraftId(null);
      setGraftForm({
        graft_variety_id: "",
        method: "grafting",
        source_type: "unknown",
        source_plant_id: "",
        purchase_item_id: "",
        position_name: "",
        grafted_at: "",
        status: "alive",
        note: "",
      });

      await loadData();
    } catch (err: any) {
      toastError(err.message || "เพิ่มยอดไม่สำเร็จ");
    }
  };

  const handleDeleteGraft = async (graftId: number) => {
    if (!confirm("ลบยอดนี้?")) return;

    try {
      await api(`/plant-grafts/${graftId}`, {
        method: "DELETE",
      });

      toastSuccess("ลบยอดสำเร็จ");
      await loadData();
    } catch (err: any) {
      toastError(err.message || "ลบยอดไม่สำเร็จ");
    }
  };

  const handleEditGraft = (graft: PlantGraft) => {
      setEditingGraftId(graft.id);

      setGraftForm({
        graft_variety_id: String(graft.graft_variety_id || ""),
        method: graft.method || "grafting",
        source_type: graft.source_type || "unknown",
        source_plant_id: String(graft.source_plant_id || ""),
        purchase_item_id: String(graft.purchase_item_id || ""),
        position_name: graft.position_name || "",
        grafted_at: graft.grafted_at
          ? String(graft.grafted_at).slice(0, 10)
          : "",
        status: graft.status || "alive",
        note: graft.note || "",
      });

      setOpenGraftModal(true);
    };

  const openUploadWidget = () => {
    if (openingUpload || uploadingImage) return;

    if (!(window as any).cloudinary) {
      alert("Cloudinary not loaded");
      return;
    }

    const cloudinary = (window as any).cloudinary;

    if (!cloudinary) {
      alert("Cloudinary ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่");
      return;
    }

    setOpeningUpload(true);

    const widget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dk7hhxcwn",
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
          setNoteImagePublicId(publicId);
        }

        if (result?.event === "close") {
          setOpeningUpload(false);
          setUploadingImage(false);
        }

        if (error) {
          setOpeningUpload(false);
          setUploadingImage(false);
        }
      },
    );
    if (!widget) {
      alert("ไม่สามารถเปิดหน้าต่างอัปโหลดได้");
      return;
    }

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
    [],
  );

  const sourceLabel: Record<string, string> = useMemo(
    () => ({
      purchase: "ซื้อมา",
      propagation: "ขยายพันธุ์",
      unknown: "ไม่ระบุ",
    }),
    [],
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
    [],
  );

  const imageLabel: Record<string, string> = useMemo(
    () => ({
      seller_post: "โพสต์",
      seller_chat: "แชท",
      slip: "สลิป",
      received: "ได้รับ",
      other: "อื่นๆ",
    }),
    [],
  );

  const graftMethodLabel: Record<string, string> = {
    grafting: "เสียบยอด",
    budding: "ติดตา",
    other: "อื่นๆ",
  };

  const graftSourceLabel: Record<string, string> = {
    purchase: "ซื้อมา",
    own_garden: "จากต้นในสวน",
    unknown: "ไม่ระบุ",
  };

  const graftStatusLabel: Record<string, string> = {
    alive: "ติดแล้ว / ยังอยู่",
    failed: "ไม่ติด",
    removed: "ตัดออกแล้ว",
  };

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
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="afterInteractive"
      />
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
          <div>
            สถานะ: {statusLabel[plant.status || ""] || plant.status || "-"}
          </div>
          <div>วันที่รับเข้า: {formatDateTime(plant.acquired_at)}</div>
          <div>ต้นทุน: {formatNumber(plant.cost_per_unit)} บาท</div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
          <h2 className="font-semibold">ที่มา</h2>
          <div>
            ที่มา:{" "}
            {sourceLabel[plant.source_type || ""] || plant.source_type || "-"}
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
                <span className="font-medium">
                  {purchaseItem.species_name || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">สายพันธุ์:</span>{" "}
                <span className="font-medium">
                  {purchaseItem.variety_name || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">ประเภท:</span>{" "}
                <span className="font-medium">
                  {purchaseItem.item_type || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">จำนวน:</span>{" "}
                <span className="font-medium">
                  {purchaseItem.quantity || "-"}
                </span>
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
                  {imageLabel[img.image_type ?? ""] || "image"}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">ยอด / สายพันธุ์บนต้นนี้</h2>

          {(isSuper || user?.permissions?.includes("plant.update")) && (
  <button
    onClick={() => {
      setEditingGraftId(null);
      setGraftForm({
        graft_variety_id: "",
        method: "grafting",
        source_type: "unknown",
        source_plant_id: "",
        purchase_item_id: "",
        position_name: "",
        grafted_at: "",
        status: "alive",
        note: "",
      });
      setOpenGraftModal(true);
    }}
    className="px-3 py-2 rounded bg-green-700 hover:bg-green-800 text-white text-sm"
  >
    + เพิ่มยอด
  </button>
)}
        </div>

        {grafts.length === 0 ? (
          <div className="text-gray-500 text-sm">
            ยังไม่มีข้อมูลยอดหรือสายพันธุ์ที่เสียบบนต้นนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grafts.map((graft) => (
              <div
                key={graft.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2"
              >
                <div className="font-semibold text-green-700 dark:text-green-400">
                  {graft.graft_variety_name ||
                    `สายพันธุ์ #${graft.graft_variety_id}`}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-300">
                  วิธี: {graftMethodLabel[graft.method] || graft.method}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-300">
                  ที่มา:{" "}
                  {graftSourceLabel[graft.source_type] || graft.source_type}
                </div>

                {graft.purchase_item_id && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    รายการซื้อ: #{graft.purchase_item_id}
                  </div>
                )}

                {graft.source_plant_name && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    ต้นแม่/แหล่งยอด: {graft.source_plant_name}
                  </div>
                )}

                {graft.position_name && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    ตำแหน่ง: {graft.position_name}
                  </div>
                )}

                <div className="text-sm text-gray-600 dark:text-gray-300">
                  วันที่ทำ:{" "}
                  {graft.grafted_at ? formatDateTime(graft.grafted_at) : "-"}
                </div>

                <div className="text-sm">
                  สถานะ:{" "}
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                    {graftStatusLabel[graft.status] || graft.status}
                  </span>
                </div>

                {graft.note && (
                  <div className="text-sm text-gray-500 border-t pt-2 mt-2">
                    {graft.note}
                  </div>
                )}

                {(isSuper || user?.permissions?.includes("plant.update")) && (
  <div className="flex gap-2 pt-2">
    <button
      onClick={() => handleEditGraft(graft)}
      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs"
    >
      แก้ไข
    </button>

    <button
      onClick={() => handleDeleteGraft(graft.id)}
      className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
    >
      ลบ
    </button>
  </div>
)}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <h2 className="font-semibold mb-4">Timeline การเติบโต</h2>

        <div className="space-y-4">
          {timeline.length === 0 && (
            <div className="text-gray-500">ยังไม่มี timeline</div>
          )}

          {timeline.map((item) => (
            <div
              key={item.id}
              className="border-l-4 border-green-600 pl-4 py-1"
            >
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
                  จาก{" "}
                  {statusLabel[item.old_status || ""] || item.old_status || "-"}{" "}
                  →{" "}
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

      {openGraftModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold">
                {editingGraftId
                  ? "แก้ไขยอด / สายพันธุ์"
                  : "เพิ่มยอด / สายพันธุ์บนต้นนี้"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">สายพันธุ์ยอด *</label>
                <select
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                  value={graftForm.graft_variety_id}
                  onChange={(e) =>
                    setGraftForm({
                      ...graftForm,
                      graft_variety_id: e.target.value,
                    })
                  }
                >
                  <option value="">เลือกสายพันธุ์</option>
                  {varieties.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">วิธี</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={graftForm.method}
                    onChange={(e) =>
                      setGraftForm({ ...graftForm, method: e.target.value })
                    }
                  >
                    <option value="grafting">เสียบยอด</option>
                    <option value="budding">ติดตา</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">สถานะ</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={graftForm.status}
                    onChange={(e) =>
                      setGraftForm({ ...graftForm, status: e.target.value })
                    }
                  >
                    <option value="alive">ติดแล้ว / ยังอยู่</option>
                    <option value="failed">ไม่ติด</option>
                    <option value="removed">ตัดออกแล้ว</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">ที่มา</label>
                <select
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                  value={graftForm.source_type}
                  onChange={(e) =>
                    setGraftForm({
                      ...graftForm,
                      source_type: e.target.value,
                      source_plant_id: "",
                      purchase_item_id: "",
                    })
                  }
                >
                  <option value="unknown">ไม่ระบุ</option>
                  <option value="purchase">ซื้อมา</option>
                  <option value="own_garden">จากต้นในสวน</option>
                </select>
              </div>

              {graftForm.source_type === "own_garden" && (
                <div>
                  <label className="text-sm font-medium">ต้นแม่ / แหล่งยอดในสวน</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={graftForm.source_plant_id}
                    onChange={(e) =>
                      setGraftForm({
                        ...graftForm,
                        source_plant_id: e.target.value,
                      })
                    }
                  >
                    <option value="">เลือกต้นแม่ / แหล่งยอด</option>
                    {sourcePlantOptions
                      .filter((p) => String(p.id) !== String(id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.plant_code ? `${p.plant_code} - ` : ""}
                          {p.display_name || p.name || `Plant #${p.id}`}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {graftForm.source_type === "purchase" && (
                <div>
                  <label className="text-sm font-medium">รายการซื้อ</label>
                  <select
                    className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                    value={graftForm.purchase_item_id}
                    onChange={(e) =>
                      setGraftForm({
                        ...graftForm,
                        purchase_item_id: e.target.value,
                      })
                    }
                  >
                    <option value="">เลือกรายการซื้อ</option>
                    {purchaseItems.map((item) => {
                        const dateText = item.received_date
                          ? String(item.received_date).slice(0, 10)
                          : item.purchase_date
                            ? String(item.purchase_date).slice(0, 10)
                            : "-";

                        const price = item.display_price || item.cost_per_unit || item.unit_price || 0;

                        return (
                          <option key={item.id} value={item.id}>
                            #{item.purchase_id || item.id} | {dateText} |{" "}
                            {item.supplier_name || "-"} | {item.species_name || "-"} /{" "}
                            {item.variety_name || "-"} | {item.item_type || "-"} | ฿{price}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">ตำแหน่งบนต้น</label>
                <input
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                  placeholder="เช่น กิ่งซ้าย, กิ่งบน, ด้านหน้า"
                  value={graftForm.position_name}
                  onChange={(e) =>
                    setGraftForm({
                      ...graftForm,
                      position_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">วันที่ทำ</label>
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                  value={graftForm.grafted_at}
                  onChange={(e) =>
                    setGraftForm({ ...graftForm, grafted_at: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">หมายเหตุ</label>
                <textarea
                  rows={3}
                  className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                  value={graftForm.note}
                  onChange={(e) =>
                    setGraftForm({ ...graftForm, note: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
              <button
                onClick={() => setOpenGraftModal(false)}
                className="px-4 py-2 border rounded"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveGraft}
                className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
