"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
// import { api } from "@/lib/api";

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
  image_url?: string;
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

function HtmlBlock({ html }: { html?: string }) {
  if (!html) return null;

  return (
    <div
      className="prose prose-invert max-w-none prose-p:leading-8 prose-p:text-slate-200 prose-li:text-slate-200 prose-strong:text-white prose-a:text-green-400"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function InfoSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-xl">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-green-400">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      <div className="text-slate-200 leading-8">{children}</div>
    </section>
  );
}

export default function VarietyPublicPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<Variety | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const displayTitle = useMemo(() => {
    return data?.public_title || data?.name || "-";
  }, [data]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadVariety = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_URL}/plant-varieties/qr/${token}`, {
        method: "GET",
        cache: "no-store",
      });
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
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 shadow-xl">
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-slate-900 p-6 text-center shadow-xl">
          <div className="text-xl font-bold text-red-400">ไม่พบข้อมูล</div>
          {error && <div className="mt-2 text-sm text-slate-400">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="preview"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <main className="mx-auto max-w-4xl">
        <div className="relative">
          {data.cover_image_url ? (
            <img
              src={data.cover_image_url}
              alt={displayTitle}
              className="h-[320px] w-full object-cover sm:h-[420px]"
              onClick={() => {
                if (data.cover_image_url) {
                  setPreviewImage(data.cover_image_url)
                }
              }}
            />
          ) : (
            <div className="h-[260px] w-full bg-gradient-to-br from-green-900 via-slate-900 to-slate-950" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        </div>

        <div className="relative z-10 -mt-16 px-4 pb-10 sm:px-6">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-300">
                  🌿 Plant Variety
                </div>

                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  {displayTitle}
                </h1>

                {data.short_name && (
                  <div className="mt-3 inline-flex rounded-full border border-green-500/50 bg-slate-950 px-4 py-1.5 text-sm font-bold text-green-300">
                    {data.short_name}
                  </div>
                )}

                {data.subtitle && (
                  <p className="mt-3 text-lg text-slate-300">{data.subtitle}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {data.highlight_text && (
              <section className="rounded-3xl border-l-4 border-green-500 bg-slate-900/90 p-5 shadow-xl">
                <h2 className="mb-3 text-lg font-bold text-green-400">
                  📌 ลักษณะเด่น
                </h2>
                <p className="whitespace-pre-line leading-8 text-slate-200">
                  {data.highlight_text}
                </p>
              </section>
            )}

            {(data.sunlight || data.watering) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.sunlight && (
                  <div className="rounded-3xl border border-yellow-500/30 bg-slate-900 p-5 shadow-xl">
                    <div className="mb-2 text-lg font-bold text-yellow-300">
                      ☀️ แสง
                    </div>
                    <div className="leading-7 text-slate-200">{data.sunlight}</div>
                  </div>
                )}

                {data.watering && (
                  <div className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-5 shadow-xl">
                    <div className="mb-2 text-lg font-bold text-cyan-300">
                      💧 น้ำ
                    </div>
                    <div className="leading-7 text-slate-200">{data.watering}</div>
                  </div>
                )}
              </div>
            )}

            {data.planting_method && (
              <InfoSection icon="🌱" title="วิธีปลูก">
                <HtmlBlock html={data.planting_method} />
              </InfoSection>
            )}

            {data.care_method && (
              <InfoSection icon="🪴" title="การดูแล">
                <HtmlBlock html={data.care_method} />
              </InfoSection>
            )}

            {data.tips && (
              <InfoSection icon="💡" title="เคล็ดลับ">
                <HtmlBlock html={data.tips} />
              </InfoSection>
            )}

            {data.public_note && (
              <InfoSection icon="📖" title="ข้อมูลเพิ่มเติม">
                <HtmlBlock html={data.public_note} />
              </InfoSection>
            )}

            {data.gallery.length > 0 && (
              <section className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-xl">
                <h2 className="mb-4 text-lg font-bold text-green-400">
                  📸 รูปเพิ่มเติม
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.gallery.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${displayTitle}-${i + 1}`}
                      onClick={() => setPreviewImage(img)}
                      className="h-40 w-full cursor-pointer rounded-2xl object-cover transition duration-300 hover:scale-[1.03] hover:opacity-90"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="py-10 text-center text-sm text-slate-400">
            🌿 KM Garden Plant Collection
          </div>
        </div>
      </main>
    </div>
  );
}