"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api"

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
  gallery?: string[];
};

export default function VarietyPublicPage({ params }: any) {
  const [data, setData] = useState<Variety | null>(null);

  useEffect(() => {
    api(`/plant-varieties/${params.token}`)
      .then((res) => res.json())
      .then(setData);
  }, [params.token]);

  if (!data) return <div className="p-6">กำลังโหลด...</div>;

  return (
    <div className="max-w-xl mx-auto bg-white min-h-screen">

      {/* HERO */}
      {data.cover_image_url && (
        <img
          src={data.cover_image_url}
          className="w-full h-72 object-cover"
        />
      )}

      <div className="p-4 space-y-4">

        {/* TITLE */}
        <div>
          <h1 className="text-2xl font-bold">
            🌿 {data.public_title || data.name}
          </h1>
          {data.subtitle && (
            <p className="text-gray-500">{data.subtitle}</p>
          )}
        </div>

        {/* HIGHLIGHT */}
        {data.highlight_text && (
          <section>
            <h2 className="font-semibold mb-1">📌 ลักษณะเด่น</h2>
            <p>{data.highlight_text}</p>
          </section>
        )}

        {/* SUN / WATER */}
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

        {/* PLANTING */}
        {data.planting_method && (
          <section>
            <h2 className="font-semibold mb-1">🌱 วิธีปลูก</h2>
            <div dangerouslySetInnerHTML={{ __html: data.planting_method }} />
          </section>
        )}

        {/* CARE */}
        {data.care_method && (
          <section>
            <h2 className="font-semibold mb-1">🪴 การดูแล</h2>
            <div dangerouslySetInnerHTML={{ __html: data.care_method }} />
          </section>
        )}

        {/* TIPS */}
        {data.tips && (
          <section>
            <h2 className="font-semibold mb-1">💡 เคล็ดลับ</h2>
            <div dangerouslySetInnerHTML={{ __html: data.tips }} />
          </section>
        )}

        {/* NOTE */}
        {data.public_note && (
          <section>
            <h2 className="font-semibold mb-1">📖 ข้อมูลเพิ่มเติม</h2>
            <div dangerouslySetInnerHTML={{ __html: data.public_note }} />
          </section>
        )}

        {/* GALLERY */}
        {data.gallery && data.gallery.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2">📸 รูปเพิ่มเติม</h2>
            <div className="grid grid-cols-2 gap-2">
              {data.gallery.map((img, i) => (
                <img key={i} src={img} className="rounded" />
              ))}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <div className="text-center text-sm text-gray-400 pt-6">
          🌱 Chamaiporn Garden
        </div>

      </div>
    </div>
  );
}