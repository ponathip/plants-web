"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import CkEditorField from "@/components/CkEditorField"

interface PlantSpecies {
  id: number;
  name: string;
}

interface PlantVariety {
  id: number;
  plant_species_id: number | string;
  species_name?: string;
  name: string;
  short_name?: string;

  public_qr_token?: string;
  is_public?: number | boolean;
  public_title?: string;
  subtitle?: string;
  highlight_text?: string;
  planting_method?: string;
  care_method?: string;
  sunlight?: string;
  watering?: string;
  tips?: string;
  public_note?: string;
  cover_image_url?: string;
  gallery_json?: string;
  sort_order?: number;

  note?: string;
  image_url?: string;
  image_public_id?: string;

  created_at?: string;
  updated_at?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PlantVarietiesPage() {
  const [data, setData] = useState<PlantVariety[]>([]);
  const [speciesOptions, setSpeciesOptions] = useState<PlantSpecies[]>([]);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [openingUpload, setOpeningUpload] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlantVariety | null>(null);

  const [qrUrl, setQrUrl] = useState("");
  const [openQr, setOpenQr] = useState(false);
  const [selectedQrToken, setSelectedQrToken] = useState("");

  const [form, setForm] = useState({
    plant_species_id: "",
    name: "",
    short_name: "",

    public_qr_token: "",
    is_public: true,
    public_title: "",
    subtitle: "",
    highlight_text: "",
    planting_method: "",
    care_method: "",
    sunlight: "",
    watering: "",
    tips: "",
    public_note: "",
    cover_image_url: "",
    gallery_json: "[]",
    sort_order: 0,

    note: "",
    image_url: "",
    image_public_id: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchSpecies = async () => {
    try {
      const res = await fetch(`${API_URL}/species`, {
        credentials: "include",
      });
      const json = await res.json();
      setSpeciesOptions(Array.isArray(json) ? json : json.data || []);
    } catch (err) {
      console.error("fetch species failed", err);
    }
  };

  const fetchPlantVarieties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/plant-varieties/varieties-data`, {
        credentials: "include",
      });
      const json = await res.json();
      setData(Array.isArray(json) ? json : json.data || []);
    } catch (err) {
      console.error("fetch plant varieties failed", err);
    } finally {
      setLoading(false);
    }
  };

  const optimizeCloudinaryUrl = (url: string, width = 900) => {
    if (!url.includes("/upload/")) return url
    return url.replace(
      "/upload/",
      `/upload/f_auto,q_auto,w_${width},c_limit/`
    )
  }

  const openUploadWidget = () => {
  if (typeof window === "undefined") return;

  const cloudinary = (window as any).cloudinary;

  if (!cloudinary) {
    alert("Cloudinary ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่");
    return;
  }

  if (openingUpload || uploadingImage) return;

  setOpeningUpload(true);

  const widget = cloudinary.createUploadWidget(
    {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dk7hhxcwn",
      uploadPreset: "plants_varieties",
      sources: ["local", "camera"],
      multiple: false,
      maxFiles: 1,
      cropping: false,
      showAdvancedOptions: false,
      maxFileSize: 2000000,
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
      resourceType: "image",
      folder: "plants/varieties",
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
        const url = result.info.secure_url;
        const publicId = result.info.public_id;

        setForm((prev) => ({
          ...prev,
          image_url: url,
          image_public_id: publicId,
          cover_image_url: prev.cover_image_url || url,
        }));

        setPreview(url);
        setOpeningUpload(false);
        setUploadingImage(false);
      }

      if (result?.event === "close") {
        setOpeningUpload(false);
        setUploadingImage(false);
      }
    }
  );

  if (!widget) {
    setOpeningUpload(false);
    alert("ไม่สามารถเปิด Cloudinary Widget ได้");
    return;
  }

  widget.open();
};

  useEffect(() => {
    fetchPlantVarieties();
    fetchSpecies();
  }, []);

  const keyword = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return data.filter((v) => {
      const matchSearch = !keyword
        ? true
        : v.name?.toLowerCase().includes(keyword) ||
          v.short_name?.toLowerCase().includes(keyword) ||
          v.species_name?.toLowerCase().includes(keyword);

      const matchSpecies = speciesFilter
        ? String(v.plant_species_id) === String(speciesFilter)
        : true;

      return matchSearch && matchSpecies;
    });
  }, [data, keyword, speciesFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => {
    setForm({
      plant_species_id: "",
      name: "",
      short_name: "",

      public_qr_token: "",
      is_public: true,
      public_title: "",
      subtitle: "",
      highlight_text: "",
      planting_method: "",
      care_method: "",
      sunlight: "",
      watering: "",
      tips: "",
      public_note: "",
      cover_image_url: "",
      gallery_json: "[]",
      sort_order: 0,

      note: "",
      image_url: "",
      image_public_id: "",
    });
    setFile(null);
    setPreview(null);
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (v: PlantVariety) => {
    setEditing(v);
    setForm({
      plant_species_id: String(v.plant_species_id || ""),
      name: v.name || "",
      short_name: v.short_name || "",

      public_qr_token: v.public_qr_token || "",
      is_public: Boolean(v.is_public),
      public_title: v.public_title || "",
      subtitle: v.subtitle || "",
      highlight_text: v.highlight_text || "",
      planting_method: v.planting_method || "",
      care_method: v.care_method || "",
      sunlight: v.sunlight || "",
      watering: v.watering || "",
      tips: v.tips || "",
      public_note: v.public_note || "",
      cover_image_url: v.cover_image_url || "",
      gallery_json: v.gallery_json || "[]",
      sort_order: Number(v.sort_order || 0),

      note: v.note || "",
      image_url: v.image_url || "",
      image_public_id: v.image_public_id || "",
    });

      setPreview(v.image_url || null);
      setOpen(true);
  };

  const savePlantVariety = async () => {
    if (!form.plant_species_id) {
      alert("กรุณาเลือกชนิดพืช");
      return;
    }

    if (!form.name.trim()) {
      alert("กรุณากรอกชื่อพันธุ์");
      return;
    }

    try {
      // const fd = new FormData();
      // fd.append("plant_species_id", String(form.plant_species_id));
      // fd.append("name", form.name);
      // fd.append("short_name", form.short_name || "");

      // fd.append("public_qr_token", form.public_qr_token || "");
      // fd.append("is_public", form.is_public ? "1" : "0");
      // fd.append("public_title", form.public_title || "");
      // fd.append("subtitle", form.subtitle || "");
      // fd.append("highlight_text", form.highlight_text || "");
      // fd.append("planting_method", form.planting_method || "");
      // fd.append("care_method", form.care_method || "");
      // fd.append("sunlight", form.sunlight || "");
      // fd.append("watering", form.watering || "");
      // fd.append("tips", form.tips || "");
      // fd.append("public_note", form.public_note || "");
      // fd.append("cover_image_url", form.cover_image_url || "");
      // fd.append("gallery_json", form.gallery_json || "[]");
      // fd.append("sort_order", String(form.sort_order || 0));

      // fd.append("note", form.note || "");
      // fd.append("image_url", form.image_url || "");
      // fd.append("image_public_id", form.image_public_id || "");
      // // if (file) fd.append("image", file);
      const payload = {
        plant_species_id: Number(form.plant_species_id),
        name: form.name,
        short_name: form.short_name || "",

        public_qr_token: form.public_qr_token || "",
        is_public: form.is_public ? 1 : 0,
        public_title: form.public_title || "",
        subtitle: form.subtitle || "",
        highlight_text: form.highlight_text || "",
        planting_method: form.planting_method || "",
        care_method: form.care_method || "",
        sunlight: form.sunlight || "",
        watering: form.watering || "",
        tips: form.tips || "",
        public_note: form.public_note || "",
        cover_image_url: form.cover_image_url || "",
        gallery_json: form.gallery_json || "[]",
        sort_order: Number(form.sort_order || 0),

        note: form.note || "",
        image_url: form.image_url || "",
        image_public_id: form.image_public_id || "",
      };

      if (editing) {
        await fetch(`${API_URL}/plant-varieties/${editing.id}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_URL}/plant-varieties`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      setOpen(false);
      resetForm();
      fetchPlantVarieties();
    } catch (err) {
      console.error("save plant variety failed", err);
    }
  };

  const deletePlantVariety = async (v: PlantVariety) => {
    const ok = confirm(`ลบพันธุ์ “${v.name}” ใช่หรือไม่?`);
    if (!ok) return;

    try {
      await fetch(`${API_URL}/plant-varieties/${v.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchPlantVarieties();
    } catch (err) {
      console.error("delete plant variety failed", err);
    }
  };

  const deleteImage = async () => {
    if (!editing) return;

    try {
      await fetch(`${API_URL}/plant-varieties/${editing.id}/image`, {
        method: "DELETE",
        credentials: "include",
      });

      setPreview(null);
      setEditing({ ...editing, image_url: undefined });
      fetchPlantVarieties();
    } catch (err) {
      console.error("delete image failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="afterInteractive"
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌿 สายพันธุ์พืช</h1>
          <p className="text-gray-500 dark:text-gray-400">
            จัดการข้อมูล สายพันธุ์พืช
          </p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          ➕ เพิ่มพันธุ์พืช
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="ค้นหาชื่อ / ชื่อย่อ / ชนิดพืช"
          className="w-full max-w-sm px-3 py-2 rounded border dark:border-gray-700 bg-transparent"
        />

        <select
          value={speciesFilter}
          onChange={(e) => {
            setSpeciesFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">ทุกชนิดพืช</option>
          {speciesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                <tr>
                  <th className="p-3">รูป</th>
                  <th className="p-3">ชนิดพืช</th>
                  <th className="p-3">ชื่อพันธุ์</th>
                  <th className="p-3">ชื่อย่อ</th>
                  <th className="p-3">แสดงหน้า QR</th>
                  {/* <th className="p-3">QR Token</th> */}
                  <th className="p-3 w-32">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {pagedData.map((v) => (
                  <tr key={v.id} className="border-t dark:border-gray-700">
                    <td className="p-3">
                      {v.image_url ? (
                        <img
                          src={`${v.image_url}`}
                          className="h-12 w-12 object-cover rounded"
                          alt={v.name}
                          onClick={() =>
                            setPreviewImage(`${v.image_url}`)
                          }
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                      )}
                    </td>
                    <td className="p-3">{v.species_name || "-"}</td>
                    <td className="p-3">{v.name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      {v.short_name || "-"}
                    </td>
                    <td className="p-3">{v.is_public ? "เปิด" : "ปิด"}</td>
                    {/* <td className="p-3">{v.public_qr_token || "-"}</td> */}
                    <td className="p-2 space-x-3">
                      <button
                        onClick={() => openEdit(v)}
                        className="px-2 py-1 text-xs rounded bg-blue-500 text-white"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => deletePlantVariety(v)}
                        className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                      >
                        ลบ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/qr/plant/${v.public_qr_token}`;
                          setQrUrl(url);
                          setSelectedQrToken(v.public_qr_token || "");
                          setOpenQr(true);
                        }}
                        className="px-2 py-1 text-xs rounded bg-green-500 text-white"
                      >
                        QR
                      </button>
                    </td>
                  </tr>
                ))}

                {pagedData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-2 p-3 text-sm">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  ← ก่อนหน้า
                </button>
                <span>
                  หน้า {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  ถัดไป →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 sm:p-6">
            <div className="w-auto max-w-3xl my-4 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">
                  {editing ? "แก้ไขพันธุ์พืช" : "เพิ่มพันธุ์พืช"}
                </h2>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-10rem)] p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">ชนิดพืช</label>
                  <select
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    value={form.plant_species_id}
                    onChange={(e) =>
                      setForm({ ...form, plant_species_id: e.target.value })
                    }
                  >
                    <option value="">เลือกชนิดพืช</option>
                    {speciesOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">ชื่อพันธุ์</label>
                  <input
                    className="w-full px-3 py-2 rounded border dark:border-gray-700 bg-transparent"
                    placeholder="ชื่อพันธุ์พืช"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">ชื่อย่อ</label>
                  <input
                    className="w-full px-3 py-2 rounded border dark:border-gray-700 bg-transparent"
                    placeholder="เช่น NDM"
                    value={form.short_name}
                    onChange={(e) =>
                      setForm({ ...form, short_name: e.target.value })
                    }
                  />
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-medium">ข้อมูลหน้า QR </h3>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!form.is_public}
                      onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                    />
                    <span className="text-sm">เปิดหน้า QR</span>
                  </label>

                  {/* <div className="space-y-1">
                    <label className="text-sm font-medium">QR Token</label>
                    <input
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.public_qr_token}
                      onChange={(e) => setForm({ ...form, public_qr_token: e.target.value })}
                      placeholder="เช่น ชือสายพันธ์ุ"
                    />
                  </div> */}

                  <div className="space-y-1">
                    <label className="text-sm font-medium">ชื่อแสดง</label>
                    <input
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.public_title}
                      onChange={(e) => setForm({ ...form, public_title: e.target.value })}
                      placeholder="เช่น ชือสายพันธ์ุ"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">ลักษณะ</label>
                    <input
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      placeholder="เช่น รสหวาน"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">จุดเด่น</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.highlight_text}
                      onChange={(e) => setForm({ ...form, highlight_text: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">แสง</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.sunlight}
                      onChange={(e) => setForm({ ...form, sunlight: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">น้ำ</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.watering}
                      onChange={(e) => setForm({ ...form, watering: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">วิธีปลูก</label>
                    <CkEditorField
                      value={form.planting_method}
                      onChange={(value) => setForm({ ...form, planting_method: value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">การดูแล</label>
                    <CkEditorField
                      value={form.care_method}
                      onChange={(value) => setForm({ ...form, care_method: value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">เคล็ดลับ</label>
                    <CkEditorField
                      value={form.tips}
                      onChange={(value) => setForm({ ...form, tips: value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">ข้อมูลเพิ่มเติม</label>
                    <CkEditorField
                      value={form.public_note}
                      onChange={(value) => setForm({ ...form, public_note: value })}
                    />
                  </div>

                  {/* <div className="space-y-1">
                    <label className="text-sm font-medium">Cover Image URL</label>
                    <input
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.cover_image_url}
                      onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                    />
                  </div> */}

                  {/* <div className="space-y-1">
                    <label className="text-sm font-medium">Gallery JSON</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm"
                      value={form.gallery_json}
                      onChange={(e) => setForm({ ...form, gallery_json: e.target.value })}
                      placeholder='["https://.../1.jpg","https://.../2.jpg"]'
                    />
                  </div> */}

                  {/* <div className="space-y-1">
                    <label className="text-sm font-medium">ลำดับแสดงผล</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm({ ...form, sort_order: Number(e.target.value || 0) })
                      }
                    />
                  </div> */}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">รายละเอียด</label>
                  <div className="bg-white text-black rounded">
                    <CkEditorField
                      value={form.note}
                      onChange={(value) => setForm({ ...form, note: value })}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openUploadWidget}
                  disabled={openingUpload || uploadingImage}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white"
                >
                  {openingUpload
                    ? "กำลังเปิดหน้าต่างอัปโหลด..."
                    : uploadingImage
                    ? "กำลังอัปโหลดรูป..."
                    : "📷 เลือกรูป / ถ่ายรูป"}
                </button>

                {openingUpload && (
                  <div className="text-sm text-blue-600">กำลังเปิด Cloudinary...</div>
                )}

                {uploadingImage && (
                  <div className="text-sm text-green-600">กำลังอัปโหลดรูป กรุณารอสักครู่...</div>
                )}

                {/* <div className="space-y-1">
                  <label className="text-sm font-medium">รูปภาพ</label> */}
                  {/* <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                      if (f) setPreview(URL.createObjectURL(f));
                    }}
                    className="w-full text-sm"
                  /> */}
                {/* </div> */}

                {preview && (
                  <div className="space-y-2">
                    <img
                      src={optimizeCloudinaryUrl(preview || "", 900)}
                      className="h-48 w-full object-cover rounded border"
                      alt="preview"
                      onClick={() =>
                        setPreviewImage(preview)
                      }
                    />
                    {editing && (
                      <button
                        onClick={deleteImage}
                        className="w-full px-3 py-2 text-sm rounded bg-red-500 text-white"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={savePlantVariety}
                  className="px-4 py-2 rounded bg-green-600 text-white"
                >
                  บันทึก
                </button>
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
                      `${window.location.origin}/qr/varieties/${selectedQrToken}`,
                    )}`}
                    alt="Plant QR"
                    className="mx-auto p-3 bg-white rounded-xl shadow"
                  />

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
                      window.open(`/qr/varieties/${selectedQrToken}`, "_blank")
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