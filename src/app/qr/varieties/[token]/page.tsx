"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type VarietyApi = {
  name?: string;
  short_name?: string;
  public_title?: string;
  subtitle?: string;
  highlight_text?: string;
  sunlight?: string;
  watering?: string;
  planting_method?: string;
  care_method?: string;
  tips?: string;
  public_note?: string;
  cover_image_url?: string;
  gallery?: string[];
  gallery_json?: string | string[];
};

type Variety = {
  name: string;
  short_name?: string;
  public_title?: string;
  subtitle?: string;
  highlight_text?: string;
  sunlight?: string;
  watering?: string;
  planting_method?: string;
  care_method?: string;
  tips?: string;
  public_note?: string;
  cover_image_url?: string;
  gallery: string[];
};

function normalizeGallery(input: VarietyApi | null | undefined): string[] {
  if (!input) return [];

  if (Array.isArray(input.gallery)) {
    return input.gallery.filter(Boolean);
  }

  if (Array.isArray(input.gallery_json)) {
    return input.gallery_json.filter(Boolean);
  }

  if (typeof input.gallery_json === "string" && input.gallery_json.trim()) {
    try {
      const parsed = JSON.parse(input.gallery_json);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeVariety(payload: any): Variety | null {
  const raw =
    payload?.variety ||
    payload?.data ||
    payload?.plant_variety ||
    payload?.plant_varieties?.[0] ||
    payload ||
    null;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  return {
    name: raw.name || "",
    short_name: raw.short_name || "",
    public_title: raw.public_title || "",
    subtitle: raw.subtitle || "",
    highlight_text: raw.highlight_text || "",
    sunlight: raw.sunlight || "",
    watering: raw.watering || "",
    planting_method: raw.planting_method || "",
    care_method: raw.care_method || "",
    tips: raw.tips || "",
    public_note: raw.public_note || "",
    cover_image_url: raw.cover_image_url || raw.image_url || "",
    gallery: normalizeGallery(raw),
  };
}
export default function VarietyPublicPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<Variety | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayTitle = useMemo(() => {
    return data?.public_title || data?.name || "-";
  }, [data]);

  const loadVariety = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api(`/plant-varieties/qr/${token}`);
      const normalized = normalizeVariety(res);

      if (!normalized) {
        setData(null);
        setError("ไม่พบข้อมูล");
        return;
      }

      setData(normalized);
    } catch (err: any) {
      setData(null);
      setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadVariety();
  }, [token]);

  if (loading) {
    return <div className="p-6">กำลังโหลด...</div>;
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium">ไม่พบข้อมูล</div>
        {error && <div className="mt-2 text-sm text-gray-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white min-h-screen text-gray-900">
      {data.cover_image_url && (
        <img
          src={data.cover_image_url}
          alt={displayTitle}
          className="w-full h-72 object-cover"
        />
      )}

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">🌿 {displayTitle}</h1>
          {data.subtitle && <p className="text-gray-500">{data.subtitle}</p>}
        </div>

        {data.highlight_text && (
          <section>
            <h2 className="font-semibold mb-1">📌 ลักษณะเด่น</h2>
            <p>{data.highlight_text}</p>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          {data.sunlight && (
            <div className="bg-yellow-50 p-3 rounded">
              <div className="font-medium">☀️ แสง</div>
              <div>{data.sunlight}</div>
            </div>
          )}

          {data.watering && (
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-medium">💧 น้ำ</div>
              <div>{data.watering}</div>
            </div>
          )}
        </div>

        {data.planting_method && (
          <section>
            <h2 className="font-semibold mb-1">🌱 วิธีปลูก</h2>
            <div dangerouslySetInnerHTML={{ __html: data.planting_method }} />
          </section>
        )}

        {data.care_method && (
          <section>
            <h2 className="font-semibold mb-1">🪴 การดูแล</h2>
            <div dangerouslySetInnerHTML={{ __html: data.care_method }} />
          </section>
        )}

        {data.tips && (
          <section>
            <h2 className="font-semibold mb-1">💡 เคล็ดลับ</h2>
            <div dangerouslySetInnerHTML={{ __html: data.tips }} />
          </section>
        )}

        {data.public_note && (
          <section>
            <h2 className="font-semibold mb-1">📖 ข้อมูลเพิ่มเติม</h2>
            <div dangerouslySetInnerHTML={{ __html: data.public_note }} />
          </section>
        )}

        {data.gallery.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2">📸 รูปเพิ่มเติม</h2>
            <div className="grid grid-cols-2 gap-2">
              {data.gallery.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${displayTitle}-${i + 1}`}
                  className="rounded object-cover w-full h-40"
                />
              ))}
            </div>
          </section>
        )}

        <div className="text-center text-sm text-gray-400 pt-6">
          🌱 km Garden
        </div>
      </div>
    </div>
  );
}