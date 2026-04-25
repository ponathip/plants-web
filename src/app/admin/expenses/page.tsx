"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGarden } from "@/context/GardenContext";
import { useUser } from "@/context/UserContext";
import { toastError, toastSuccess } from "@/lib/toast";

type ExpenseCategory = "fertilizer" | "chemical" | "equipment" | "labor" | "transport" | "other";

type Garden = {
  id: number;
  name: string;
};

type Expense = {
  id?: number;
  garden_id?: number;
  garden_name?: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  note?: string;
  image_url?: string;
};

const initialForm: Expense = {
  category: "other",
  title: "",
  amount: 0,
  expense_date: "",
  note: "",
  image_url: "",
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ExpensesPage() {
  const { gardenId } = useGarden();
  const { user, loadingUser } = useUser();
  const isSuper = user?.role === "super";

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayText = firstDay.toISOString().slice(0, 10);

  const [data, setData] = useState<Expense[]>([]);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [gardenFilter, setGardenFilter] = useState("");
  const [selectedGardenId, setSelectedGardenId] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [from, setFrom] = useState(firstDayText);
  const [to, setTo] = useState(today);

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<Expense>(initialForm);

  const loadGardens = async () => {
    try {
      const res = await api("/gardens");
      setGardens(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error("loadGardens error:", err);
    }
  };

  const load = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        search,
        category: categoryFilter,
      });

      if (from) params.set("from", from);
      if (to) params.set("to", to);

      if (isSuper && gardenFilter) {
        params.set("garden_id", gardenFilter);
      }

      const res = await api(`/expenses?${params.toString()}`);
      setData(Array.isArray(res) ? res : res.data || []);
    } catch (err: any) {
      toastError(err.message || "โหลดค่าใช้จ่ายไม่สำเร็จ");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      search,
      category: categoryFilter,
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (isSuper && gardenFilter) {
      params.set("garden_id", gardenFilter);
    }
    
    window.open(`${API_URL}/expenses/export?${params.toString()}`, "_blank");
  };

  useEffect(() => {
    if (loadingUser) return;

    if (isSuper) {
      loadGardens();
      setSelectedGardenId("");
    } else {
      setSelectedGardenId(String(gardenId || ""));
    }
  }, [loadingUser, isSuper, gardenId]);

  useEffect(() => {
    if (loadingUser) return;
    load();
  }, [loadingUser, isSuper, gardenFilter, gardenId, search, categoryFilter, from, to]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setSelectedGardenId(isSuper ? "" : String(gardenId || ""));
    setOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      id: expense.id,
      garden_id: expense.garden_id,
      garden_name: expense.garden_name,
      category: expense.category || "other",
      title: expense.title || "",
      amount: Number(expense.amount || 0),
      expense_date: expense.expense_date
        ? String(expense.expense_date).slice(0, 16)
        : "",
      note: expense.note || "",
      image_url: expense.image_url || "",
    });
    setSelectedGardenId(String(expense.garden_id || ""));
    setOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.amount || !form.expense_date) {
      toastError("กรอกข้อมูลให้ครบ");
      return;
    }

    if (isSuper && !selectedGardenId) {
      toastError("กรุณาเลือกสวน");
      return;
    }

    const payload: any = {
      category: form.category,
      title: form.title,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      note: form.note || "",
      image_url: form.image_url || "",
    };

    if (isSuper) {
      payload.garden_id = Number(selectedGardenId);
    }

    try {
      if (editing?.id) {
        await api(`/expenses/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toastSuccess("อัปเดตสำเร็จ");
      } else {
        await api("/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toastSuccess("เพิ่มค่าใช้จ่ายสำเร็จ");
      }

      setOpen(false);
      setForm(initialForm);
      setEditing(null);
      await load();
    } catch (err: any) {
      toastError(err.message || "บันทึกไม่สำเร็จ");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("ลบรายการนี้?")) return;

    try {
      await api(`/expenses/${id}`, { method: "DELETE" });
      load();
      toastSuccess("ลบสำเร็จ");
      await load();
    } catch (err: any) {
      toastError(err.message || "ลบไม่สำเร็จ");
    }
  };

  const categoryLabel = {
    fertilizer: "ปุ๋ย",
    chemical: "ยา",
    equipment: "อุปกรณ์",
    labor: "ค่าแรง",
    transport: "ขนส่ง",
    other: "อื่นๆ",
  };

  if (loadingUser) {
    return (
      <div className="space-y-6 p-6 bg-white dark:bg-gray-900 rounded-xl">
        กำลังโหลดข้อมูลผู้ใช้...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-900 rounded-xl">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">💸 ค่าใช้จ่าย</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Export CSV
          </button>

          <button
            onClick={openCreate}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + เพิ่ม
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหารายการ"
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">ทุกประเภท</option>
          <option value="fertilizer">ปุ๋ย</option>
          <option value="chemical">ยา</option>
          <option value="equipment">อุปกรณ์</option>
          <option value="labor">ค่าแรง</option>
          <option value="transport">ขนส่ง</option>
          <option value="other">อื่นๆ</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        {isSuper && (
          <select
            value={gardenFilter}
            onChange={(e) => setGardenFilter(e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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

      {!loading && data.length === 0 && (
        <div className="text-gray-500">ยังไม่มีรายการค่าใช้จ่าย</div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-left">
            <tr className="border-t dark:border-gray-700">
              {isSuper && <th className="p-3">สวน</th>}
              <th className="p-3">ประเภท</th>
              <th className="p-3">รายการ</th>
              <th className="p-3">จำนวนเงิน</th>
              <th className="p-3">วันที่</th>
              <th className="p-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id} className="border-t dark:border-gray-700">
                {isSuper && <td className="p-3">{e.garden_name || "-"}</td>}
                <td className="p-3">{categoryLabel[e.category]}</td>
                <td className="p-3">{e.title}</td>
                <td className="p-3">{Number(e.amount || 0).toLocaleString()}</td>
                <td className="p-3">{e.expense_date ? new Date(e.expense_date).toLocaleString() : "-"}</td>
                <td className="p-3 space-x-2">
                  <button onClick={() => openEdit(e)}
                    className="px-2 py-1 text-xs rounded bg-blue-500 text-white">แก้ไข</button>
                  <button onClick={() => remove(e.id!)}
                    className="px-2 py-1 text-xs rounded bg-red-500 text-white">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded w-auto max-w-[420px] space-y-3">
            {isSuper && (
              <div className="space-y-1">
              <label className="text-sm font-medium">สวน</label>
              <select
                value={selectedGardenId}
                onChange={(e) => setSelectedGardenId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              <label className="text-sm font-medium">ประเภทค่าใช้จ่าย</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="fertilizer">ปุ๋ย</option>
                <option value="chemical">ยา</option>
                <option value="equipment">อุปกรณ์</option>
                <option value="labor">ค่าแรง</option>
                <option value="transport">ขนส่ง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">รายการ</label>
              <input
                placeholder="รายการ"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border p-2 bg-white dark:bg-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">จำนวนเงิน</label>
              <input
                type="number"
                placeholder="จำนวนเงิน"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: Number(e.target.value) })
                }
                className="w-full border p-2 bg-white dark:bg-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">วันที่</label>
              <input
                type="datetime-local"
                value={form.expense_date}
                onChange={(e) =>
                  setForm({ ...form, expense_date: e.target.value })
                }
                className="w-full border p-2 bg-white dark:bg-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">หมายเหตุ</label>
              <textarea
                placeholder="หมายเหตุ"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full border p-2 bg-white dark:bg-gray-900"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                  setForm(initialForm);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                ยกเลิก
              </button>
              <button
                onClick={save}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}