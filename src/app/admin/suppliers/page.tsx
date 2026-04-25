"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { useGarden } from "@/context/GardenContext";
import { useUser } from "@/context/UserContext";

type SupplierStatus = "active" | "inactive";

type Garden = {
  id: number;
  name: string;
};

type Supplier = {
  id?: number;
  garden_id?: number;
  garden_name?: string;
  name: string;
  contact_name: string;
  phone: string;
  line_id: string;
  facebook: string;
  address: string;
  note: string;
  status: SupplierStatus;
  created_at?: string;
  updated_at?: string;
};

const initialForm: Supplier = {
  name: "",
  contact_name: "",
  phone: "",
  line_id: "",
  facebook: "",
  address: "",
  note: "",
  status: "active",
};

export default function SuppliersPage() {
  const { gardenId } = useGarden();
  const { user, loadingUser } = useUser();

  const isSuper = user?.role === "super";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [gardenFilter, setGardenFilter] = useState("");
  const [selectedGardenId, setSelectedGardenId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierStatus>("all");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Supplier>(initialForm);
  const [saving, setSaving] = useState(false);

  const totalPage = Math.max(1, Math.ceil(total / limit));

  const loadGardens = async () => {
    try {
      const data = await api("/gardens");
      setGardens(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("loadGardens error:", err);
    }
  };

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      });

      // super เลือก filter สวนได้
      if (isSuper && gardenFilter) {
        params.set("garden_id", gardenFilter);
      }

      const data = await api(`/suppliers/suppliers?${params.toString()}`);
      setSuppliers(Array.isArray(data) ? data : data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "โหลดข้อมูล supplier ไม่สำเร็จ");
    } finally {
      setLoading(false);
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
    loadSuppliers();
  }, [page, search, statusFilter, gardenFilter, isSuper, loadingUser]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);

    // super ต้องเลือกสวนเอง, non-super ไม่ต้อง
    setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
    setOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setSelectedGardenId(String(supplier.garden_id || ""));

    setForm({
      id: supplier.id,
      name: supplier.name || "",
      contact_name: supplier.contact_name || "",
      phone: supplier.phone || "",
      line_id: supplier.line_id || "",
      facebook: supplier.facebook || "",
      address: supplier.address || "",
      note: supplier.note || "",
      status: supplier.status || "active",
      garden_id: supplier.garden_id,
      garden_name: supplier.garden_name,
    });

    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toastError("กรุณากรอกชื่อ supplier");
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        name: form.name.trim(),
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        line_id: form.line_id || null,
        facebook: form.facebook || null,
        address: form.address || null,
        note: form.note || null,
        status: form.status,
      };

      if (isSuper) {
        if (!selectedGardenId) {
          toastError("กรุณาเลือกสวน");
          return;
        }
        payload.garden_id = Number(selectedGardenId);
      }

      if (editing?.id) {
        await api(`/suppliers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toastSuccess("อัปเดต supplier สำเร็จ");
      } else {
        await api(`/suppliers`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toastSuccess("เพิ่ม supplier สำเร็จ");
      }

      setOpen(false);
      setEditing(null);
      setForm(initialForm);
      setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
      loadSuppliers();
    } catch (err: any) {
      toastError(err.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!supplier.id) return;

    const ok = confirm(`ลบ supplier "${supplier.name}" ใช่หรือไม่?`);
    if (!ok) return;

    try {
      await api(`/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      toastSuccess("ลบ supplier สำเร็จ");
      loadSuppliers();
    } catch (err: any) {
      toastError(err.message || "ลบ supplier ไม่สำเร็จ");
    }
  };

  const statusLabel = useMemo(
    () => ({
      active: "ใช้งาน",
      inactive: "ปิดใช้งาน",
    }),
    []
  );

  if (loadingUser) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <p>กำลังโหลดข้อมูลผู้ใช้...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🏪 Suppliers</h1>
          <p className="text-gray-500 dark:text-gray-400">
            จัดการข้อมูลผู้ขาย / แหล่งที่มา
          </p>
        </div>

        <button
          onClick={openCreate}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded"
        >
          + เพิ่ม Supplier
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="ค้นหาชื่อ / ผู้ติดต่อ / เบอร์ / Line"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="border px-3 py-2 rounded w-full max-w-md bg-white dark:bg-gray-800"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as "all" | SupplierStatus);
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="all">ทั้งหมด</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>

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

      {!loading && suppliers.length === 0 && (
        <p className="text-gray-500">ไม่มีข้อมูล supplier</p>
      )}

      {!loading && suppliers.length > 0 && (
        <table className="w-full border rounded shadow overflow-hidden text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {isSuper && <th className="p-3 text-left">สวน</th>}
              <th className="p-3 text-left">ชื่อ</th>
              <th className="p-3 text-left">ผู้ติดต่อ</th>
              <th className="p-3 text-left">เบอร์โทร</th>
              <th className="p-3 text-left">Line</th>
              <th className="p-3 text-left">สถานะ</th>
              <th className="p-3 text-left">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {suppliers.map((s) => (
              <tr
                key={s.id}
                className="border-t hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {isSuper && (
                  <td className="p-3 text-left">{s.garden_name || "-"}</td>
                )}
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.contact_name || "-"}</td>
                <td className="p-3">{s.phone || "-"}</td>
                <td className="p-3">{s.line_id || "-"}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      s.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {statusLabel[s.status]}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="px-2 py-1 text-xs rounded bg-blue-500 text-white"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span>
          หน้า {page} / {totalPage}
        </span>

        <button
          disabled={page === totalPage}
          onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 sm:p-6">
            <div className="w-auto max-w-2xl my-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold">
                  {editing ? "แก้ไข Supplier" : "เพิ่ม Supplier"}
                </h2>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-10rem)] px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isSuper && (
                    <div className="space-y-1 md:col-span-2">
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

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">ชื่อ Supplier *</label>
                    <input
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.name || ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">ผู้ติดต่อ</label>
                    <input
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.contact_name || ""}
                      onChange={(e) =>
                        setForm({ ...form, contact_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">เบอร์โทร</label>
                    <input
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Line ID</label>
                    <input
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.line_id || ""}
                      onChange={(e) => setForm({ ...form, line_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Facebook/หรือลิงค์ติดต่อ</label>
                    <input
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.facebook || ""}
                      onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">ที่อยู่</label>
                    <textarea
                      rows={3}
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">หมายเหตุ</label>
                    <textarea
                      rows={3}
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.note || ""}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">สถานะ</label>
                    <select
                      className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as SupplierStatus })
                      }
                    >
                      <option value="active">ใช้งาน</option>
                      <option value="inactive">ปิดใช้งาน</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                    setForm(initialForm);
                    setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
                  }}
                  className="px-4 py-2 border rounded"
                >
                  ยกเลิก
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}