"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Script from "next/script";

type PlantData = {
  id: number;
  name?: string | null;
  display_name?: string | null;
  status?: "alive" | "sold" | "dead" | string;
  acquired_at?: string | null;
  last_update_at?: string | null;
  image_url?: string | null;
  species_name?: string | null;
  plant_variety_name?: string | null;
  supplier_name?: string | null;
  cost_per_unit?: number | string | null;
  purchase_item_id?: number | null;
};

type TimelineItem = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  event_date: string;
  event_type?: string;
};

type PlantVarietiesData = {
  short_name?: string | null;
  image_url?: string | null;
  note: string;
};

type PurchaseItem = {
  id: number;
  purchase_id?: number;
  species_name?: string | null;
  variety_name?: string | null;
  item_type?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
  shipping_allocated?: number | null;
  cost_total?: number | null;
  cost_per_unit?: number | null;
  note?: string | null;
};

type PurchaseImage = {
  id: number;
  image_url: string;
  image_type?: string | null;
  purchase_item_id?: number | null;
};

type PlantGraft = {
  id: number;
  graft_variety_name?: string;
  method: "grafting" | "budding" | "other";
  source_type: "purchase" | "own_garden" | "unknown";
  source_plant_name?: string | null;
  position_name?: string | null;
  grafted_at?: string | null;
  status: "active" | "alive" | "failed" | "removed";
  note?: string | null;
  removed_at?: string | null;
  removed_reason?: string | null;
  replaced_by_graft_id?: number | null;
  replaced_from_graft_id?: number | null;
};

type QrUser = {
  userId?: number;
  id?: number;
  role?: string;
  permissions?: string[];
};

function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("th-TH")} บาท`;
}

function optimizeCloudinaryUrl(url?: string | null, width = 900) {
  if (!url) return "";
  if (!url.includes("/upload/")) return url;

  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

export default function PlantQrPage() {
  const params = useParams();
  const token = params?.token as string;

  const [plant, setPlant] = useState<PlantData | null>(null);
  const [plantVarieties, setPlantVarieties] = useState<PlantVarietiesData[]>(
    [],
  );
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [purchaseItem, setPurchaseItem] = useState<PurchaseItem | null>(null);
  const [purchaseImages, setPurchaseImages] = useState<PurchaseImage[]>([]);
  const [purchaseItemImages, setPurchaseItemImages] = useState<PurchaseImage[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [openingUpload, setOpeningUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [grafts, setGrafts] = useState<PlantGraft[]>([]);
  const [qrUser, setQrUser] = useState<QrUser | null>(null);

  const [timelineForm, setTimelineForm] = useState({
    title: "",
    description: "",
    event_date: new Date().toISOString().slice(0, 16),
    image_url: "",
  });

  const checkQrUser = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        setQrUser(null);
        return;
      }

      const json = await res.json();
      setQrUser(json);
    } catch {
      setQrUser(null);
    }
  };

  const [replaceModal, setReplaceModal] = useState<PlantGraft | null>(null)
  const [replaceForm, setReplaceForm] = useState({
    new_variety_id: "",
    method: "grafting",
    position_name: "",
    grafted_at: new Date().toISOString().slice(0, 10),
    reason: "",
    note: "",
  })

  const [removeModal, setRemoveModal] = useState<PlantGraft | null>(null);

  const [removeForm, setRemoveForm] = useState({
    reason: "",
    removed_at: new Date().toISOString().slice(0, 10),
  });

  const saveRemoveScion = async () => {
    if (!removeModal) return;

    try {
      setSaving(true);

      await api(`/grafts/${removeModal.id}/remove-scion`, {
        method: "POST",
        body: JSON.stringify({
          reason: removeForm.reason || null,
          removed_at: removeForm.removed_at || null,
        }),
      });

      setRemoveModal(null);
      setRemoveForm({
        reason: "",
        removed_at: new Date().toISOString().slice(0, 10),
      });
      await loadPlant();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Remove scion failed");
    } finally {
      setSaving(false);
    }
  };

  const loadPlant = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api(`/plants/qr/${token}`);

      setPlant(data.plant || null);
      setPlantVarieties(
        Array.isArray(data.plant_varieties) ? data.plant_varieties : [],
      );
      setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
      setPurchaseItem(data.purchase_item || null);
      setPurchaseImages(
        Array.isArray(data.purchase_images) ? data.purchase_images : [],
      );
      setPurchaseItemImages(
        Array.isArray(data.purchase_item_images)
          ? data.purchase_item_images
          : [],
      );
      setGrafts(Array.isArray(data.grafts) ? data.grafts : []);
    } catch (err: any) {
      setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
      setPlant(null);
      setPlantVarieties([]);
      setTimeline([]);
      setPurchaseItem(null);
      setPurchaseImages([]);
      setPurchaseItemImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadPlant();
    checkQrUser();
  }, [token]);

  const openUploadWidget = () => {
  if (openingUpload || uploadingImage) return;

  const cloudinary = (window as any).cloudinary;

  if (!cloudinary || typeof cloudinary.createUploadWidget !== "function") {
    alert("Cloudinary ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่");
    return;
  }

  setOpeningUpload(true);

  const widget = cloudinary.createUploadWidget(
    {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dk7hhxcwn",
      uploadPreset: "plants_timeline",
      sources: ["local", "camera"],
      multiple: false,
      maxFiles: 1,
      maxFileSize: 2000000000,
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
      resourceType: "image",
      folder: "plants/timeline",
    },
    (error: any, result: any) => {
      if (error) {
        console.error("Cloudinary upload error:", error);
        setOpeningUpload(false);
        setUploadingImage(false);
        alert("อัปโหลดรูปไม่สำเร็จ");
        return;
      }

      if (result?.event === "display-changed") {
        setOpeningUpload(false);
      }

      if (result?.event === "upload-added") {
        setOpeningUpload(false);
        setUploadingImage(true);
      }

      if (result?.event === "success") {
        setOpeningUpload(false);
        setUploadingImage(false);

        setTimelineForm((prev) => ({
          ...prev,
          image_url: result.info.secure_url,
        }));
      }

      if (result?.event === "close") {
        setOpeningUpload(false);
        setUploadingImage(false);
      }
    }
  );

  if (!widget) {
    setOpeningUpload(false);
    alert("เปิด Cloudinary Widget ไม่สำเร็จ");
    return;
  }

  widget.open();
  };

  const createTimeline = async () => {
    try {
      if (!plant?.id) {
        setError("ไม่พบข้อมูลต้นพืช");
        return;
      }

      if (!timelineForm.title.trim()) {
        setError("กรุณากรอกหัวข้อ");
        return;
      }

      if (!timelineForm.event_date) {
        setError("กรุณาเลือกวันที่");
        return;
      }

      setSaving(true);
      setError("");

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plant-timelines/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plant_id: plant.id,
          title: timelineForm.title,
          description: timelineForm.description || null,
          image_url: timelineForm.image_url || null,
          event_date: timelineForm.event_date,
        }),
      });

      setOpenModal(false);
      setTimelineForm({
        title: "",
        description: "",
        event_date: new Date().toISOString().slice(0, 16),
        image_url: "",
      });

      await loadPlant();
    } catch (err: any) {
      setError(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const loginToEdit = () => {
    window.location.href = `/login?redirect=${encodeURIComponent(
      window.location.pathname
    )}`;
  };

  const updateStatus = async (status: "alive" | "dead") => {
    try {
      setSaving(true);
      setError("");

      await api(`/plants/qr/${token}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      await loadPlant();
    } catch (err: any) {
      setError(err.message || "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const saveReplaceScion = async () => {
    if (!replaceModal) return

    if (!replaceForm.new_variety_id) {
      setError("กรุณากรอกสายพันธุ์ใหม่");
      return;
    }

    try {
      setSaving(true)

      await api(`/grafts/${replaceModal.id}/replace-scion`, {
        method: "POST",
        body: JSON.stringify({
          new_variety_id: Number(replaceForm.new_variety_id),
          method: replaceForm.method,
          position_name: replaceForm.position_name || null,
          grafted_at: replaceForm.grafted_at || null,
          reason: replaceForm.reason || null,
          note: replaceForm.note || null,
        }),
      })

      setReplaceModal(null)
      setReplaceForm({
        new_variety_id: "",
        method: "grafting",
        position_name: "",
        grafted_at: new Date().toISOString().slice(0, 10),
        reason: "",
        note: "",
      })
      await loadPlant()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Replace scion failed")
    } finally {
      setSaving(false)
    }
  }

  const getAgeText = (acquiredAt?: string | null) => {
    if (!acquiredAt) return "-";

    const start = new Date(acquiredAt);
    const now = new Date();

    if (isNaN(start.getTime())) return "-";

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years > 0) return `${years} ปี ${months} เดือน`;
    if (months > 0) return `${months} เดือน ${days} วัน`;
    return `${Math.max(days, 0)} วัน`;
  };

  const getStatusLabel = (status?: string) => {
    if (status === "alive") return "ยังมีชีวิต";
    if (status === "dead") return "ตายแล้ว";
    if (status === "sold") return "ขายแล้ว";
    return status || "-";
  };

  const getStatusClass = (status?: string) => {
    if (status === "alive") return "bg-green-100 text-green-800";
    if (status === "dead") return "bg-red-100 text-red-800";
    if (status === "sold") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const graftMethodLabel: Record<string, string> = {
    grafting: "เสียบยอด",
    budding: "ติดตา",
    other: "อื่นๆ",
  };

  const graftStatusLabel: Record<string, string> = {
    alive: "ติดแล้ว / ยังอยู่",
    failed: "ไม่ติด",
    removed: "ตัดออกแล้ว",
  };

  const activeGrafts = grafts.filter((g) => g.status === "active" || g.status === "alive")
  const historyGrafts = grafts.filter((g) => g.status === "removed" || g.status === "failed")

  const displayName =
    plant?.display_name || plant?.name || plant?.plant_variety_name || "-";

  const allPurchaseGallery = useMemo(() => {
    return [...purchaseItemImages, ...purchaseImages];
  }, [purchaseItemImages, purchaseImages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-xl mx-auto bg-white text-gray-900 rounded-2xl shadow p-6">
          กำลังโหลด...
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-xl mx-auto bg-white text-gray-900 rounded-2xl shadow p-6">
          <div className="text-red-600 font-medium">ไม่พบข้อมูล</div>
          {error && <div className="mt-2 text-sm text-gray-600">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-xl mx-auto space-y-4">
        {(plantVarieties[0]?.image_url || plant.image_url) && (
          <img
            src={optimizeCloudinaryUrl(
              plantVarieties[0]?.image_url || plant.image_url || "",
              900,
            )}
            alt={displayName}
            className="w-full h-72 object-cover rounded-2xl shadow"
          />
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold">🌱 {displayName}</h1>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                plant.status,
              )}`}
            >
              {getStatusLabel(plant.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4">
            <div>
              <span className="text-gray-500">ชนิดพืช:</span>{" "}
              <span className="font-medium">{plant.species_name || "-"}</span>
            </div>

            <div>
              <span className="text-gray-500">อายุ:</span>{" "}
              <span className="font-medium">
                {getAgeText(plant.acquired_at)}
              </span>
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
          </div>
        </div>

        {/* {purchaseItem && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
            <h2 className="font-semibold text-lg">🛒 รายละเอียดที่มาจากรายการซื้อ</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
              <div>
                <span className="text-gray-500">ราคาต่อหน่วย:</span>{" "}
                <span className="font-medium">{formatMoney(purchaseItem.unit_price)}</span>
              </div>
              <div>
                <span className="text-gray-500">ต้นทุนต่อหน่วย:</span>{" "}
                <span className="font-medium">{formatMoney(purchaseItem.cost_per_unit)}</span>
              </div>
            </div>

            {purchaseItem.note && (
              <div className="text-sm">
                <span className="text-gray-500">หมายเหตุ:</span>{" "}
                <span className="font-medium">{purchaseItem.note}</span>
              </div>
            )}

            {allPurchaseGallery.length > 0 && (
              <div className="space-y-3">
                <div className="font-medium text-sm">รูปประกอบจากการซื้อ</div>
                <div className="grid grid-cols-2 gap-3">
                  {allPurchaseGallery.map((img) => (
                    <img
                      key={img.id}
                      src={optimizeCloudinaryUrl(img.image_url, 640)}
                      alt={`purchase-${img.id}`}
                      className="w-full h-36 object-cover rounded-xl border border-gray-200"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )} */}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
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

        {activeGrafts.length > 0 && (
          <section className="rounded-2xl border border-green-800/50 bg-gray-900 p-5">
            <h2 className="text-lg font-bold text-white mb-3">
              ✅ ยอดปัจจุบัน
            </h2>

            <div className="space-y-3">
              {activeGrafts.map((graft) => (
                <div
                  key={graft.id}
                  className="rounded-xl border border-green-700 bg-green-950/20 p-4"
                >
                  <div className="font-bold text-green-300">
                    {graft.graft_variety_name}
                  </div>

                  <div className="text-sm text-gray-300">
                    Method: {graft.method}
                  </div>

                  <div className="text-sm text-gray-300">
                    Position: {graft.position_name || "-"}
                  </div>

                  <div className="mt-4 space-y-2">
                    {!qrUser ? (
                      <button
                        onClick={loginToEdit}
                        className="w-full rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white"
                      >
                        🔐 Login to Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setReplaceModal(graft)}
                          className="w-full rounded-lg bg-orange-600 px-3 py-2 text-white"
                        >
                          🔄 Replace Scion
                        </button>

                        <button
                          onClick={() => setRemoveModal(graft)}
                          className="w-full rounded-lg bg-red-600 px-3 py-2 text-white"
                        >
                          ❌ Remove Scion
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {historyGrafts.length > 0 && (
          <section className="rounded-2xl border border-slate-700 bg-gray-900 p-5">
            <h2 className="text-lg font-bold text-white mb-3">
              📜 ประวัติยอดเดิม
            </h2>

            <div className="space-y-3">
              {historyGrafts.map((graft) => (
                <div key={graft.id} className="rounded-xl bg-slate-800 p-4">
                  <div className="font-bold text-slate-200">
                    {graft.graft_variety_name}
                  </div>
                  <div className="text-sm text-gray-400">
                    สถานะ: {graftStatusLabel[graft.status] || graft.status}
                  </div>
                  <div className="text-sm text-gray-400">
                    เหตุผล: {graft.removed_reason || "-"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-semibold text-lg">📈 การเติบโต</h2>

          {timeline.length === 0 && (
            <div className="text-gray-500 mt-3">ยังไม่มีการอัปเดต</div>
          )}

          <div className="space-y-4 mt-3">
            {timeline.map((t) => (
              <div key={t.id} className="border-l-2 border-green-500 pl-4">
                <div className="text-xs text-gray-400">
                  {new Date(t.event_date).toLocaleDateString("th-TH")}
                </div>

                <div className="font-medium mt-1">{t.title}</div>

                {t.description && (
                  <div className="text-sm text-gray-700 mt-1">
                    {t.description}
                  </div>
                )}

                {t.image_url && (
                  <img
                    src={`${optimizeCloudinaryUrl(t.image_url, 640)}`}
                    alt={t.title}
                    className="mt-3 rounded-xl border border-gray-200"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Dialog
          open={openModal}
          onClose={() => {
            if (!saving) setOpenModal(false);
          }}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

          <div className="fixed inset-0 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 text-gray-900 shadow-xl space-y-3">
                <DialogTitle className="text-lg font-semibold">
                  เพิ่มการอัปเดต
                </DialogTitle>

                <input
                  autoFocus
                  placeholder="หัวข้อ"
                  value={timelineForm.title}
                  onChange={(e) =>
                    setTimelineForm({ ...timelineForm, title: e.target.value })
                  }
                  className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900"
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
                  className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900"
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
                  className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900"
                />

                {timelineForm.image_url && (
                  <img
                    src={timelineForm.image_url}
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

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenModal(false)}
                    className="rounded border px-4 py-2"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    onClick={createTimeline}
                    disabled={saving}
                    className="rounded bg-green-600 px-4 py-2 text-white"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>

        {replaceModal && (
          <Dialog
            open={!!replaceModal}
            onClose={() => setReplaceModal(null)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/50" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 text-gray-900 space-y-3">
                <DialogTitle className="text-lg font-semibold">
                  Replace Scion
                </DialogTitle>

                <div className="text-sm">
                  Old scion: <b>{replaceModal.graft_variety_name}</b>
                </div>

                <input
                  value={replaceForm.new_variety_id}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      new_variety_id: e.target.value,
                    })
                  }
                  placeholder="New variety id"
                  className="w-full rounded border p-2"
                />

                <select
                  value={replaceForm.method}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      method: e.target.value,
                    })
                  }
                  className="w-full rounded border p-2"
                >
                  <option value="grafting">เสียบยอด</option>
                  <option value="budding">ติดตา</option>
                  <option value="other">อื่นๆ</option>
                </select>

                <input
                  value={replaceForm.position_name}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      position_name: e.target.value,
                    })
                  }
                  placeholder="Position เช่น Top / Left / Right"
                  className="w-full rounded border p-2"
                />

                <input
                  type="date"
                  value={replaceForm.grafted_at}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      grafted_at: e.target.value,
                    })
                  }
                  className="w-full rounded border p-2"
                />

                <textarea
                  value={replaceForm.reason}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Reason เช่น Scion damaged"
                  className="w-full rounded border p-2"
                  rows={3}
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReplaceModal(null)}
                    className="rounded border px-4 py-2"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveReplaceScion}
                    disabled={saving}
                    className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        )}


        {removeModal && (
          <Dialog
            open={!!removeModal}
            onClose={() => setRemoveModal(null)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/50" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 text-gray-900 space-y-3">
                <DialogTitle className="text-lg font-semibold">
                  Remove Scion
                </DialogTitle>

                <div className="text-sm">
                  Scion: <b>{removeModal.graft_variety_name || "-"}</b>
                </div>

                <input
                  type="date"
                  value={removeForm.removed_at}
                  onChange={(e) =>
                    setRemoveForm({
                      ...removeForm,
                      removed_at: e.target.value,
                    })
                  }
                  className="w-full rounded border p-2"
                />

                <textarea
                  value={removeForm.reason}
                  onChange={(e) =>
                    setRemoveForm({
                      ...removeForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Reason เช่น Scion damaged"
                  className="w-full rounded border p-2"
                  rows={3}
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRemoveModal(null)}
                    className="rounded border px-4 py-2"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveRemoveScion}
                    disabled={saving}
                    className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Remove"}
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
}
