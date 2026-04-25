"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGarden } from "@/context/GardenContext";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { toast } from "sonner";

type Garden = {
  id: number;
  name: string;
};

type PurchaseRow = {
  id: number;
  garden_id?: number;
  garden_name?: string;
  supplier_name: string;
  purchase_date: string;
  items_total: number;
  shipping_cost: number;
  grand_total: number;
  item_count: number;
  cover_image: string | null;
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
function getImageSrc(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL}${url}`;
}

export default function PurchasesPage() {
  const { gardenId } = useGarden();
  const { user, loadingUser } = useUser();
  const isSuper = user?.role === "super";

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayText = firstDay.toISOString().slice(0, 10);

  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [gardenFilter, setGardenFilter] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(firstDayText);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);

  const loadGardens = async () => {
    try {
      const res = await api("/gardens");
      setGardens(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error("loadGardens error:", err);
    }
  };

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        search,
      });

      if (from) params.set("from", from);
      if (to) params.set("to", to);

      if (isSuper) {
        if (gardenFilter) {
          params.set("garden_id", gardenFilter);
        }
      }

      const res = await api(`/purchases?${params.toString()}`);
      setRows(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      search,
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (isSuper && gardenFilter) {
      params.set("garden_id", gardenFilter);
    }

    window.open(`${API_URL}/purchases/export?${params.toString()}`, "_blank");
  };

  const handleDeletePurchase = async (id: number) => {
    const ok = confirm("ลบรายการซื้อนี้?");
    if (!ok) return;

    try {
      const res = await api(`/purchases/${id}`, {
        method: "DELETE",
      });

      await loadPurchases();

      const auditLogId = res?.auditLogId;

      if (auditLogId) {
        toast("ลบรายการซื้อแล้ว", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await api(`/audit-logs/${auditLogId}/restore`, {
                  method: "POST",
                });
                await loadPurchases();
                toast.success("กู้คืนสำเร็จ");
              } catch (err: any) {
                toast.error(err.message || "Undo ไม่สำเร็จ");
              }
            },
          },
          duration: 8000,
        });
      } else {
        toast.success("ลบสำเร็จ");
      }
    } catch (err: any) {
      toast.error(err.message || "ลบไม่สำเร็จ");
    }
  };

  useEffect(() => {
    if (loadingUser) return;

    if (isSuper) {
      loadGardens();
    } else {
      setGardens([]);
      setGardenFilter("");
    }
  }, [loadingUser, isSuper]);

  useEffect(() => {
    if (loadingUser) return;
    loadPurchases();
  }, [loadingUser, isSuper, gardenId, gardenFilter, search, from, to]);

  if (loadingUser) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <div>กำลังโหลดข้อมูลผู้ใช้...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">🛒 รายการซื้อเข้า</h1>

        <div className="flex items-center gap-3">
          {isSuper && (
            <select
              value={gardenFilter}
              onChange={(e) => setGardenFilter(e.target.value)}
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
          <button
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Export CSV
          </button>

          <Link
            href="/admin/purchases/create"
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            + เพิ่มรายการซื้อ
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา ผู้จำหน่าย / ช่องทาง / note"
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        {isSuper && (
          <select
            value={gardenFilter}
            onChange={(e) => setGardenFilter(e.target.value)}
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

      {loading && <div>กำลังโหลด...</div>}

      {!loading && rows.length === 0 && (
        <div className="text-gray-500">ยังไม่มีรายการซื้อ</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="border rounded-xl overflow-hidden bg-white dark:bg-gray-800"
          >
            <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
              {row.cover_image ? (
                <img
                  src={getImageSrc(row.cover_image)}
                  alt={row.supplier_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400">ไม่มีรูป</span>
              )}
            </div>

            <div className="p-4 space-y-2">
              <div className="font-semibold">
                {row.supplier_name || "ไม่ระบุผู้ขาย"}
              </div>

              {isSuper && (
                <div className="text-sm text-gray-500">
                  สวน: {row.garden_name || "-"}
                </div>
              )}

              <div className="text-sm text-gray-500">
                วันที่ซื้อ:{" "}
                {row.purchase_date
                  ? new Date(row.purchase_date).toLocaleString()
                  : "-"}
              </div>

              <div className="text-sm text-gray-500">
                จำนวนรายการ: {row.item_count}
              </div>

              <div className="text-sm">
                ค่าสินค้า: {Number(row.items_total || 0).toLocaleString()} บาท
              </div>

              <div className="text-sm">
                ค่าส่ง: {Number(row.shipping_cost || 0).toLocaleString()} บาท
              </div>

              <div className="font-semibold text-green-600">
                รวม: {Number(row.grand_total || 0).toLocaleString()} บาท
              </div>
            </div>
            <div className="p-4 pt-0">
              <Link
                href={`/admin/purchases/${row.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 
                text-white bg-dark box-border border border-transparent 
                hover:bg-dark-strong focus:ring-4 focus:ring-neutral-tertiary 
                shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 
                focus:outline-none transition"
              >
                <span>ดูรายละเอียด</span>
                <svg
                  className="h-4 w-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 12H5m14 0-4 4m4-4-4-4"
                  />
                </svg>
              </Link>

              <button
                type="button"
                onClick={() => handleDeletePurchase(row.id)}
                className="w-full inline-flex items-center justify-center gap-2 
                  bg-red-600 hover:bg-red-700 text-white
                  shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 
                  transition"
              >
                ลบรายการ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
