"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Plant = {
  id: number;
  plant_code?: string;
  display_name?: string;
  name?: string;
  qr_token?: string;
  garden_name?: string;
};

export default function PlantQRPrintPage() {
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("plant_qr_print_items");
    if (!raw) return;

    setPlants(JSON.parse(raw));
  }, []);

  return (
    <main className="print-root">
      <div className="no-print toolbar">
        <button onClick={() => window.print()}>🖨 พิมพ์ / บันทึก PDF</button>
      </div>

      <section className="a4-page">
        {plants.map((p) => {
          const qrUrl = `${window.location.origin}/qr/plant/${p.qr_token}`;

          return (
            <div className="qr-card" key={p.id}>
              <div className="qr-title">🌿 SCAN FOR PLANT INFO</div>

              <div className="qr-center">
                <QRCodeSVG
                    value={qrUrl}
                    size={118}
                    level="H"
                    includeMargin
                />
                </div>

              <div className="plant-name">
                {p.display_name || p.name || "-"}
              </div>

              <div className="plant-code">{p.plant_code || "-"}</div>

              <div className="garden-name">{p.garden_name || "สวนหลัก"}</div>

              <div className="leaf left">🌿</div>
              <div className="leaf right">🌱</div>
            </div>
          );
        })}
      </section>

      <style jsx global>{`
        body {
          margin: 0;
          background: #e5e7eb;
          color: #111827;
        }

        .toolbar {
          padding: 16px;
          text-align: center;
        }

        .toolbar button {
          background: #166534;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 700;
          cursor: pointer;
        }

        .print-root {
          min-height: 100vh;
        }

        .a4-page {
          width: 194mm;
          min-height: 281mm;
          margin: 0 auto;
          padding: 0;
          background: white;
          display: grid;
          grid-template-columns: repeat(3, 60mm);
          grid-auto-rows: 65mm;
          gap: 5mm;
          align-content: start;
        }

       .qr-card {
  position: relative;
  width: 54mm;
  height: 54mm;
  box-sizing: border-box;
  overflow: hidden;
  text-align: center;
  border: 1px dashed #9ca3af;
  border-radius: 4mm;
  padding: 3mm 3mm 2mm;
  background: #fffef8;
  color: #111827;

  display: flex;
  flex-direction: column;
  align-items: center;
}

        .qr-card svg {
          display: block;
          margin: 0 auto;
        }
        .qr-center {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.qr-center svg {
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

        .qr-title {
          font-size: 7px;
          font-weight: 800;
          color: #15803d;
          margin-bottom: 1mm;
        }

        .plant-name {
          margin-top: 1mm;
          font-size: 9px;
          line-height: 1.15;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .plant-code {
          margin-top: 1mm;
          display: inline-block;
          min-width: 28mm;
          padding: 0.5mm 2mm;
          border: 1px solid #14532d;
          border-radius: 999px;
          font-size: 7px;
          font-weight: 700;
          color: #14532d;
          background: white;
        }

        .garden-name {
          margin-top: 0.5mm;
          font-size: 7px;
          font-weight: 600;
          color: #374151;
        }

        .leaf {
          position: absolute;
          bottom: 1mm;
          font-size: 20px;
          opacity: 0.45;
        }

        .leaf.left {
          left: 1.5mm;
        }

        .leaf.right {
          right: 1.5mm;
        }

        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }

          body {
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .a4-page {
            margin: 0 auto;
          }
        }
      `}</style>
    </main>
  );
}
