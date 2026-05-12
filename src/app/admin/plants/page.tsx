"use client";

import { useEffect, useMemo, useState } from "react";
import { useProtect } from "@/components/Protected";
import PermissionGate from "@/components/PermissionGate";
import { api } from "@/lib/api";
import { toastSuccess, toastError } from "@/lib/toast";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useGarden } from "@/context/GardenContext";
import { toast } from "sonner";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";

type PlantStatus = "alive" | "sold" | "dead";
type SourceType = "purchase" | "propagation" | "unknown";
type PropagationType =
  | ""
  | "air_layer"
  | "cutting"
  | "grafting"
  | "budding"
  | "seed"
  | "other";

type Garden = {
  id: number;
  name: string;
};

type Plant = {
  id?: number;
  garden_id?: number;
  garden_name?: string;
  species_id: string | number;
  plant_variety_id: string | number;
  plant_code: string;
  name: string;
  display_name?: string;
  qr_token?: string;
  status: PlantStatus;
  cost_per_unit: string | number;
  acquired_at: string;
  location_name: string;
  zone_name: string;
  age_value: string | number;
  age_unit: "" | "day" | "month" | "year";
  height_cm: string | number;
  trunk_diameter_mm: string | number;
  pot_size_inch: string | number;
  source_type: SourceType;
  supplier_id: string | number;
  purchase_item_id: string | number;
  propagation_type: PropagationType;
  parent_plant_id: string | number;
  rootstock_plant_id: string | number;
  rootstock_variety_id: string | number;
  source_note: string;
  image_url: string;
  supplier_name?: string;
  plant_variety_name?: string;
  cover_image_url?: string;
  image_public_id?: string;
};

const initialForm: Plant = {
  species_id: "",
  plant_variety_id: "",
  plant_code: "",
  name: "",
  status: "alive",
  cost_per_unit: "",
  acquired_at: "",
  location_name: "",
  zone_name: "",
  age_value: "",
  age_unit: "month",
  height_cm: "",
  trunk_diameter_mm: "",
  pot_size_inch: "",
  source_type: "unknown",
  supplier_id: "",
  purchase_item_id: "",
  propagation_type: "",
  parent_plant_id: "",
  rootstock_plant_id: "",
  rootstock_variety_id: "",
  source_note: "",
  image_url: "",
  cover_image_url: "",
  image_public_id: "",
};

const statusLabel = {
  alive: "ปกติ",
  sold: "ขายแล้ว",
  dead: "ตาย",
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PlantsAdminPage() {
  // useProtect("plant.view");

  const { user, loadingUser } = useUser();
  const { gardenId } = useGarden();
  const isSuper = user?.role === "super";

  const permissions = user?.permissions || [];

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayText = firstDay.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDayText);
  const [to, setTo] = useState(today);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [gardenFilter, setGardenFilter] = useState("");
  const [selectedGardenId, setSelectedGardenId] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | PlantStatus>("all");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);

  const [openQr, setOpenQr] = useState(false);
  const [selectedQrToken, setSelectedQrToken] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const [form, setForm] = useState<Plant>(initialForm);

  const [species, setSpecies] = useState<any[]>([]);
  const [varieties, setVarieties] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);
  const [parentPlantOptions, setParentPlantOptions] = useState<any[]>([]);

  const [openingUpload, setOpeningUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedPrintIds, setSelectedPrintIds] = useState<number[]>([]);
  const [printLayout, setPrintLayout] = useState<"12" | "8">("12");

  const selectedPlants = plants.filter((p) => selectedPrintIds.includes(p.id!));

  const showPurchaseFields = form.source_type === "purchase";
  const showRootstockFields =
    form.propagation_type === "grafting" || form.propagation_type === "budding";

  const totalPage = Math.max(1, Math.ceil(total / limit));

  const loadGardens = async () => {
    try {
      const data = await api("/gardens");
      setGardens(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("loadGardens error:", err);
    }
  };

  const loadPlants = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        search,
        status: filter,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (from) params.set("from", from);
      if (to) params.set("to", to);

      if (isSuper && gardenFilter) {
        params.set("garden_id", gardenFilter);
      }

      const data = await api(`/plants?${params.toString()}`);
      setPlants(Array.isArray(data) ? data : data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const supplierPath =
        isSuper && selectedGardenId
          ? `/suppliers/?garden_id=${selectedGardenId}`
          : `/suppliers`;

      const [speciesData, varietyData, supplierData, purchaseItemData] =
        await Promise.all([
          api("/species"),
          api("/plant-varieties"),
          api(supplierPath),
          api("/purchase-items"),
        ]);

      setSpecies(
        Array.isArray(speciesData) ? speciesData : speciesData.data || [],
      );
      setVarieties(
        Array.isArray(varietyData) ? varietyData : varietyData.data || [],
      );
      setSuppliers(
        Array.isArray(supplierData) ? supplierData : supplierData.data || [],
      );
      setPurchaseItems(
        Array.isArray(purchaseItemData)
          ? purchaseItemData
          : purchaseItemData.data || [],
      );
    } catch (err: any) {
      toastError(err.message || "โหลดข้อมูลตัวเลือกไม่สำเร็จ");
    }
  };

  useEffect(() => {
    if (loadingUser) return;

    if (isSuper) {
      loadGardens();
    } else {
      setGardens([]);
      setGardenFilter("");
      setSelectedGardenId("");
    }
  }, [loadingUser, isSuper]);

  useEffect(() => {
    if (loadingUser) return;

    const delay = setTimeout(() => {
      loadPlants();
    }, 300);

    return () => clearTimeout(delay);
  }, [page, search, filter, gardenFilter, isSuper, loadingUser, from, to]);

  useEffect(() => {
    setParentPlantOptions(plants || []);
  }, [plants]);

  const filteredPurchaseItems = useMemo(() => {
    return purchaseItems.filter((item) => {
      if (
        form.species_id &&
        String(item.plant_species_id) !== String(form.species_id)
      ) {
        return false;
      }
      if (
        form.plant_variety_id &&
        String(item.plant_variety_id) !== String(form.plant_variety_id)
      ) {
        return false;
      }
      return true;
    });
  }, [purchaseItems, form.species_id, form.plant_variety_id]);

  const filteredVarieties = useMemo(() => {
    if (!form.species_id) return varieties;
    return varieties.filter(
      (v: any) => String(v.plant_species_id) === String(form.species_id),
    );
  }, [varieties, form.species_id]);

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
        maxFileSize: 2000000,
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

          setForm((prev) => ({
            ...prev,
            image_url: url,
            image_public_id: publicId,
            cover_image_url: prev.cover_image_url || url,
          }));
        }

        if (result?.event === "close") {
          setOpeningUpload(false);
          setUploadingImage(false);
        }

        if (error) {
          console.error(error);
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

  const togglePrintPlant = (id: number) => {
    setSelectedPrintIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handlePrintQr = () => {
    if (selectedPlants.length === 0) {
      toastError("กรุณาเลือกต้นไม้");
      return;
    }

    localStorage.setItem(
      "plant_qr_print_items",
      JSON.stringify(selectedPlants),
    );

    window.open("/admin/plants/print-qr", "_blank");
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      search,
      status: filter,
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (isSuper && gardenFilter) {
      params.set("garden_id", gardenFilter);
    }

    window.open(`${API_URL}/plants/export?${params.toString()}`, "_blank");
  };

  const openCreate = async () => {
    setEditing(null);
    setForm(initialForm);
    setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
    await loadOptions();
    setOpen(true);
  };

  const openEdit = async (plant: Plant) => {
    setEditing(plant);
    setSelectedGardenId(String(plant.garden_id || ""));

    setForm({
      ...initialForm,
      ...plant,

      species_id: plant.species_id ?? "",
      plant_variety_id: plant.plant_variety_id ?? "",
      plant_code: plant.plant_code ?? "",
      name: plant.name ?? "",
      status: (plant.status ?? "alive") as PlantStatus,
      cost_per_unit: plant.cost_per_unit ?? "",
      acquired_at: plant.acquired_at
        ? String(plant.acquired_at).slice(0, 16)
        : "",
      location_name: plant.location_name ?? "",
      zone_name: plant.zone_name ?? "",
      age_value: plant.age_value ?? "",
      age_unit: (plant.age_unit ?? "month") as "" | "day" | "month" | "year",
      height_cm: plant.height_cm ?? "",
      trunk_diameter_mm: plant.trunk_diameter_mm ?? "",
      pot_size_inch: plant.pot_size_inch ?? "",
      source_type: (plant.source_type ?? "unknown") as SourceType,
      supplier_id: plant.supplier_id ?? "",
      purchase_item_id: plant.purchase_item_id ?? "",
      propagation_type: (plant.propagation_type ?? "") as PropagationType,
      parent_plant_id: plant.parent_plant_id ?? "",
      rootstock_plant_id: plant.rootstock_plant_id ?? "",
      rootstock_variety_id: plant.rootstock_variety_id ?? "",
      source_note: plant.source_note ?? "",
      image_url: plant.image_url ?? "",
      cover_image_url: plant.cover_image_url ?? "",
      image_public_id: plant.image_public_id ?? "",
    });

    await loadOptions();
    setOpen(true);
  };

  const savePlant = async () => {
    if (!form.species_id) return toastError("กรุณาเลือกชนิดพืช");
    if (!form.plant_variety_id && !form.name) {
      return toastError("กรุณาเลือกพันธุ์ไม้ หรือกรอกชื่อพืช");
    }

    if (isSuper && !selectedGardenId) {
      return toastError("กรุณาเลือกสวน");
    }

    const payload: any = {
      species_id: form.species_id,
      plant_variety_id: form.plant_variety_id || null,
      plant_code: form.plant_code || null,
      name: form.name || null,
      status: form.status,
      cost_per_unit: form.cost_per_unit || 0,
      acquired_at: form.acquired_at || null,
      location_name: form.location_name || null,
      zone_name: form.zone_name || null,
      age_value: form.age_value || null,
      age_unit: form.age_unit || null,
      height_cm: form.height_cm || null,
      trunk_diameter_mm: form.trunk_diameter_mm || null,
      pot_size_inch: form.pot_size_inch || null,
      source_type: form.source_type,
      supplier_id: form.supplier_id || null,
      purchase_item_id: form.purchase_item_id || null,
      propagation_type: form.propagation_type || null,
      parent_plant_id: form.parent_plant_id || null,
      rootstock_plant_id: form.rootstock_plant_id || null,
      rootstock_variety_id: form.rootstock_variety_id || null,
      source_note: form.source_note || null,
      image_url: form.image_url || null,
      cover_image_url: form.cover_image_url || null,
      image_public_id: form.image_public_id || null,
    };

    if (isSuper) {
      payload.garden_id = Number(selectedGardenId);
    }

    try {
      if (editing?.id) {
        await api(`/plants/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toastSuccess("แก้ไขสำเร็จ ✏️");
      } else {
        await api("/plants", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toastSuccess("เพิ่มพืชสำเร็จ 🌿");
      }

      setOpen(false);
      setForm(initialForm);
      setEditing(null);
      setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
      loadPlants();
    } catch (err: any) {
      toastError(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const deletePlant = async (id: number) => {
    if (!confirm("ลบพืชนี้?")) return;

    try {
      const res = await api(`/plants/${id}`, { method: "DELETE" });

      const auditLogId = res?.auditLogId || res?.auditId;

      const undo = async () => {
        await api(`/audit-logs/${auditLogId}/restore`, { method: "POST" });
        toast.success("Undo สำเร็จ");
        loadPlants();
      };

      toast("ลบแล้ว", {
        action: {
          label: "Undo",
          onClick: undo,
        },
        duration: 8000,
      });

      loadPlants();
    } catch (err: any) {
      toastError(err.message || "ลบไม่สำเร็จ");
    }
  };

  if (loadingUser) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <p>กำลังโหลดข้อมูลผู้ใช้...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="afterInteractive"
      />
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-2xl font-bold">🌱 ต้นไม้</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Export CSV
          </button>
          {(isSuper ||
            permissions.includes("plant.create") ||
            permissions.includes("plant.manage")) && (
            <button
              onClick={openCreate}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded"
            >
              + เพิ่มต้นไม้
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="ค้นหาชื่อหรือรหัสต้น..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="border px-3 py-2 rounded w-64 bg-white dark:bg-gray-800"
        />

        <select
          value={filter}
          onChange={(e) => {
            setPage(1);
            setFilter(e.target.value as any);
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="all">ทั้งหมด</option>
          <option value="alive">ปกติ</option>
          <option value="sold">ขายแล้ว</option>
          <option value="dead">ตาย</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        {isSuper && (
          <select
            value={gardenFilter}
            onChange={(e) => {
              setPage(1);
              setGardenFilter(e.target.value);
            }}
            className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
          >
            <option value="">ทุกสวน</option>
            {gardens.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <p>กำลังโหลด...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && plants.length === 0 && (
        <p className="text-gray-500">ไม่มีข้อมูล</p>
      )}

      {!loading && plants.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr className="border-t dark:border-gray-700">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      plants.length > 0 &&
                      selectedPrintIds.length === plants.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPrintIds(plants.map((p) => p.id!));
                      } else {
                        setSelectedPrintIds([]);
                      }
                    }}
                  />
                </th>

                <th className="p-3">ID</th>
                {isSuper && <th className="p-3">สวน</th>}
                <th className="p-3">รหัสต้น</th>
                <th className="p-3">ชื่อ</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {plants.map((p) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedPrintIds.includes(p.id!)}
                      onChange={() => togglePrintPlant(p.id!)}
                    />
                  </td>

                  <td className="p-3">{p.id}</td>
                  {isSuper && <td className="p-3">{p.garden_name || "-"}</td>}
                  <td className="p-3">{p.plant_code || "-"}</td>
                  <td className="p-3">{p.display_name || p.name || "-"}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-2 py-1 text-xs rounded bg-green-900 text-white"
                    >
                      อัพเดท
                    </button>
                    {(isSuper ||
                      permissions.includes("plant.delete") ||
                      permissions.includes("plant.manage")) && (
                      <button
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlant(p.id!);
                        }}
                        className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                      >
                        ลบ
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/qr/plant/${p.qr_token}`;
                        setQrUrl(url);
                        setSelectedQrToken(p.qr_token || "");
                        setOpenQr(true);
                      }}
                      className="px-2 py-1 text-xs rounded bg-blue-500 text-white"
                    >
                      QR
                    </button>

                    <Link href={`/admin/plants/${p.id}`}>
                      <span className="px-2 py-1 text-xs rounded bg-green-500 text-white">
                        รายละเอียด
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPrintIds.length > 0 && (
        <div className="rounded-2xl border border-green-700 bg-green-950/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">
                เลือกแล้ว {selectedPrintIds.length} ต้น
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {selectedPlants.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-1 rounded-full bg-gray-800 text-sm"
                  >
                    {p.plant_code}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedPrintIds([])}
              className="text-sm text-red-400"
            >
              ยกเลิกการเลือก
            </button>
          </div>

          <div className="rounded-xl border border-gray-700 p-4 space-y-4">
            <div className="text-lg font-bold">พิมพ์ QR Code</div>

            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <div className="text-sm mb-1">รูปแบบ</div>

                <select
                  value={printLayout}
                  onChange={(e) => setPrintLayout(e.target.value as "12" | "8")}
                  className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
                >
                  <option value="12">12 ใบ / หน้า</option>
                  <option value="8">8 ใบ / หน้า</option>
                </select>
              </div>

              <button
                onClick={handlePrintQr}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl"
              >
                🖨 พิมพ์ / บันทึก PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          ก่อน
        </button>

        <span>
          หน้า {page} / {totalPage}
        </span>

        <button
          disabled={page === totalPage}
          onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          ถัดไป
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 sm:p-6">
            <div className="w-auto max-w-5xl my-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold">
                  {editing ? "แก้ไขต้นไม้" : "เพิ่มต้นไม้"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  กรอกข้อมูลต้นไม้ให้ครบตามต้องการ
                </p>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-10rem)] px-6 py-5">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <section className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-medium border-b border-gray-200 dark:border-gray-800 pb-2">
                      ข้อมูลหลัก
                    </h3>

                    {isSuper && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">สวน *</label>
                        <select
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={selectedGardenId}
                          onChange={(e) => setSelectedGardenId(e.target.value)}
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
                      <label className="text-sm font-medium">
                        ชนิดสายพันธุ์
                      </label>
                      <select
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={form.species_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            species_id: e.target.value,
                            plant_variety_id: "",
                          })
                        }
                      >
                        <option value="">เลือกชนิดสายพันธุ์</option>
                        {species.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">พันธุ์ไม้</label>
                      <select
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={form.plant_variety_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            plant_variety_id: e.target.value,
                          })
                        }
                      >
                        <option value="">เลือกพันธุ์ไม้</option>
                        {filteredVarieties.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        ชื่อต้นไม้ (กรณีไม่เลือกพันธุ์)
                      </label>
                      <input
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800 disabled:opacity-60"
                        placeholder="ชื่อต้นไม้"
                        value={form.name}
                        disabled={!!form.plant_variety_id}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">รหัสต้น</label>
                        <input
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.plant_code || ""}
                          disabled
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">สถานะ</label>
                        <select
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.status}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              status: e.target.value as PlantStatus,
                            })
                          }
                        >
                          <option value="alive">ปกติ</option>
                          <option value="sold">ขายแล้ว</option>
                          <option value="dead">ตาย</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-medium border-b border-gray-200 dark:border-gray-800 pb-2">
                      ที่มา
                    </h3>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">ที่มา</label>
                      <select
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={form.source_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            source_type: e.target.value as SourceType,
                          })
                        }
                      >
                        <option value="unknown">ไม่ระบุ</option>
                        <option value="purchase">ซื้อมา</option>
                        <option value="propagation">ขยายพันธุ์</option>
                      </select>
                    </div>

                    {showPurchaseFields && (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">ผู้ขาย</label>
                          <select
                            className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                            value={form.supplier_id}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                supplier_id: e.target.value,
                              })
                            }
                          >
                            <option value="">เลือกผู้ขาย</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            รายการซื้อ
                          </label>
                          <select
                            className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                            value={form.purchase_item_id}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                purchase_item_id: e.target.value,
                              })
                            }
                          >
                            <option value="">เลือกรายการซื้อ</option>
                            {filteredPurchaseItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                #{item.purchase_id} - {item.item_type} -{" "}
                                {item.unit_price}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">ต้นทุน</label>
                        <input
                          type="number"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          placeholder="0.00"
                          value={form.cost_per_unit}
                          onChange={(e) =>
                            setForm({ ...form, cost_per_unit: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          วันที่รับเข้า
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.acquired_at}
                          onChange={(e) =>
                            setForm({ ...form, acquired_at: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-medium border-b border-gray-200 dark:border-gray-800 pb-2">
                      การขยายพันธุ์
                    </h3>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        วิธีขยายพันธุ์
                      </label>
                      <select
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={form.propagation_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            propagation_type: e.target.value as PropagationType,
                          })
                        }
                      >
                        <option value="">เลือกวิธี</option>
                        <option value="air_layer">กิ่งตอน</option>
                        <option value="cutting">ปักชำ</option>
                        <option value="grafting">เสียบยอด</option>
                        <option value="budding">ติดตา</option>
                        <option value="seed">เพาะเมล็ด</option>
                        <option value="other">อื่นๆ</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">ต้นแม่</label>
                      <select
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={form.parent_plant_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            parent_plant_id: e.target.value,
                          })
                        }
                      >
                        <option value="">เลือกต้นแม่</option>
                        {parentPlantOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name || p.name || `Plant #${p.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {showRootstockFields && (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            ต้นตอในระบบ
                          </label>
                          <select
                            className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                            value={form.rootstock_plant_id}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                rootstock_plant_id: e.target.value,
                              })
                            }
                          >
                            <option value="">เลือกต้นตอ</option>
                            {parentPlantOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.display_name || p.name || `Plant #${p.id}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            พันธุ์ต้นตอ
                          </label>
                          <select
                            className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                            value={form.rootstock_variety_id}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                rootstock_variety_id: e.target.value,
                              })
                            }
                          >
                            <option value="">เลือกพันธุ์ต้นตอ</option>
                            {varieties.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium">หมายเหตุ</label>
                      <textarea
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        rows={4}
                        value={form.source_note}
                        onChange={(e) =>
                          setForm({ ...form, source_note: e.target.value })
                        }
                      />
                    </div>
                  </section>

                  <section className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-medium border-b border-gray-200 dark:border-gray-800 pb-2">
                      ข้อมูลเพิ่มเติม
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">โซน</label>
                        <input
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.zone_name}
                          onChange={(e) =>
                            setForm({ ...form, zone_name: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">ตำแหน่ง</label>
                        <input
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.location_name}
                          onChange={(e) =>
                            setForm({ ...form, location_name: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">อายุ</label>
                        <input
                          type="number"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.age_value}
                          onChange={(e) =>
                            setForm({ ...form, age_value: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">หน่วย</label>
                        <select
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.age_unit}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              age_unit: e.target.value as
                                | "day"
                                | "month"
                                | "year"
                                | "",
                            })
                          }
                        >
                          <option value="">เลือกหน่วย</option>
                          <option value="day">วัน</option>
                          <option value="month">เดือน</option>
                          <option value="year">ปี</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">สูง (ซม.)</label>
                        <input
                          type="number"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.height_cm}
                          onChange={(e) =>
                            setForm({ ...form, height_cm: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          ลำต้น (มม.)
                        </label>
                        <input
                          type="number"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.trunk_diameter_mm}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              trunk_diameter_mm: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          กระถาง (นิ้ว)
                        </label>
                        <input
                          type="number"
                          className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                          value={form.pot_size_inch}
                          onChange={(e) =>
                            setForm({ ...form, pot_size_inch: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* <div className="space-y-1">
                      <label className="text-sm font-medium">รูปภาพ URL</label>
                      <input
                        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                        value={form.image_url}
                        onChange={(e) =>
                          setForm({ ...form, image_url: e.target.value })
                        }
                      />
                    </div> */}
                    {form.image_url && (
                      <img
                        src={form.image_url}
                        onClick={() => setPreviewImage(`${form.image_url}`)}
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
                    {openingUpload && (
                      <div className="text-sm text-blue-600">
                        กำลังเปิด Cloudinary...
                      </div>
                    )}

                    {uploadingImage && (
                      <div className="text-sm text-green-600">
                        กำลังอัปโหลดรูป กรุณารอสักครู่...
                      </div>
                    )}
                  </section>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setForm(initialForm);
                    setEditing(null);
                    setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
                  }}
                  className="px-4 py-2 border rounded"
                >
                  ยกเลิก
                </button>
                {(isSuper ||
                  permissions.includes("plant.create") ||
                  permissions.includes("plant.update")) && (
                  <button
                    onClick={savePlant}
                    className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded"
                  >
                    บันทึก
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {openQr && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-center">
              QR Code ต้นพืช
            </h2>

            {selectedQrToken ? (
              <>
                <div id="qr-print" className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                      `${window.location.origin}/qr/plant/${selectedQrToken}`,
                    )}`}
                    alt="Plant QR"
                    className="mx-auto p-3 bg-white rounded-xl shadow"
                  />

                  <div className="mt-2 text-sm font-semibold">
                    {plants.find((p) => p.qr_token === selectedQrToken)
                      ?.display_name || "ไม่ทราบชื่อ"}
                  </div>
                </div>

                <div className="text-xs break-all text-center text-gray-500">
                  {qrUrl}
                </div>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(qrUrl)}
                    className="px-3 py-2 rounded border"
                  >
                    คัดลอกลิงก์
                  </button>

                  <button
                    onClick={() =>
                      window.open(`/qr/plant/${selectedQrToken}`, "_blank")
                    }
                    className="px-3 py-2 rounded bg-green-600 text-white"
                  >
                    เปิดหน้า QR
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded bg-blue-600 text-white"
                  >
                    🖨 พิมพ์
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-red-500">ไม่พบ qr_token</div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => {
                  setOpenQr(false);
                  setSelectedQrToken("");
                }}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

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
  );
}
