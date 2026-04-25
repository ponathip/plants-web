"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

type Garden = {
  id: number;
  name: string;
};

type SaleRow = {
  id: number;
  buyer_name: string | null;
  channel: string | null;
  sold_at: string | null;
  items_total: number;
  shipping_fee: number;
  grand_total: number;
  item_count: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SalesPage() {
  const { user, loadingUser } = useUser();
  const permissions = user?.permissions || [];
  const isSuper = user?.role === "super";

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayText = firstDay.toISOString().slice(0, 10);

  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [from, setFrom] = useState(firstDayText);
  const [to, setTo] = useState(today);

  const [gardenFilter, setGardenFilter] = useState("");
  const [gardens, setGardens] = useState<Garden[]>([]);

  const canViewSales =
    isSuper ||
    permissions.includes("sale.view") ||
    permissions.includes("sale.manage");

  const canCreateSale =
    isSuper ||
    permissions.includes("sale.create") ||
    permissions.includes("sale.manage");

  const canDeleteSale =
    isSuper ||
    permissions.includes("sale.delete") ||
    permissions.includes("sale.manage");

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGardens = async () => {
    try {
      const data = await api("/gardens");
      setGardens(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("loadGardens error:", err);
    }
  };

  const loadSales = async () => {
    if (!canViewSales) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        search,
        channel: channelFilter,
      });

      if (from) params.set("from", from);
      if (to) params.set("to", to);

      if (isSuper && gardenFilter) {
        params.set("garden_id", gardenFilter);
      }

      const res = await api(`/sale/sales?${params.toString()}`);
      setRows(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadingUser) return;
    loadSales();
  }, [
    loadingUser,
    canViewSales,
    gardenFilter,
    gardenFilter,
    search,
    channelFilter,
    from,
    to,
  ]);

  useEffect(() => {
    if (loadingUser) return;

    if (isSuper) {
      loadGardens();
    } else {
      setGardens([]);
    }
  }, [loadingUser, isSuper]);

  const handleExport = () => {
    const params = new URLSearchParams({
      search,
      channel: channelFilter,
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (isSuper && gardenFilter) {
      params.set("garden_id", gardenFilter);
    }

    window.open(`${API_URL}/sale/export?${params.toString()}`, "_blank");
  };

  const handleDeleteSale = async (id: number) => {
    const ok = confirm("ลบรายการขายนี้?");
    if (!ok) return;

    try {
      const res = await api(`/sale/sales/${id}`, {
        method: "DELETE",
      });

      await loadSales();

      const auditLogId = res?.auditLogId;

      if (auditLogId) {
        toast("ลบรายการขายแล้ว", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await api(`/audit-logs/${auditLogId}/restore`, {
                  method: "POST",
                });
                await loadSales();
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

  if (loadingUser) {
    return <div className="p-6">กำลังโหลดข้อมูลผู้ใช้...</div>;
  }

  if (!canViewSales) {
    return (
      <div className="p-6 text-red-500">คุณไม่มีสิทธิ์เข้าดูรายการขาย</div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">💰 รายการขาย</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Export CSV
          </button>

          {canCreateSale && (
            <Link
              href="/admin/sales/create"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white"
            >
              + เพิ่มรายการขาย
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาผู้ซื้อ / channel / note"
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="all">ทุกช่องทาง</option>
          <option value="facebook">facebook</option>
          <option value="line">line</option>
          <option value="walk_in">หน้าสวน</option>
          <option value="shopee">shopee</option>
          <option value="other">อื่นๆ</option>
        </select>

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

      {loading && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-500">ยังไม่มีรายการขาย</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="border rounded-xl p-4 bg-white dark:bg-gray-800 hover:shadow transition"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {row.buyer_name || "ไม่ระบุผู้ซื้อ"}
                </h2>
                <span className="text-xs text-gray-500">#{row.id}</span>
              </div>

              <div className="text-sm text-gray-500">
                ช่องทาง: {row.channel || "-"}
              </div>

              <div className="text-sm text-gray-500">
                วันที่ขาย:{" "}
                {row.sold_at ? new Date(row.sold_at).toLocaleString() : "-"}
              </div>

              <div className="text-sm text-gray-500">
                จำนวนรายการ: {row.item_count}
              </div>

              <div className="pt-2 border-t space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ค่าสินค้า</span>
                  <span>
                    {Number(row.items_total || 0).toLocaleString()} บาท
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">ค่าส่ง</span>
                  <span>
                    {Number(row.shipping_fee || 0).toLocaleString()} บาท
                  </span>
                </div>

                <div className="flex justify-between font-semibold text-green-600">
                  <span>รวม</span>
                  <span>
                    {Number(row.grand_total || 0).toLocaleString()} บาท
                  </span>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <Link
                  href={`/admin/sales/${row.id}`}
                  className="inline-flex px-3 py-2 rounded bg-blue-600 text-white text-sm"
                >
                  ดูรายละเอียด
                </Link>

                {canDeleteSale && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSale(row.id)}
                    className="inline-flex px-3 py-2 rounded bg-red-600 text-white text-sm"
                  >
                    ลบ
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
