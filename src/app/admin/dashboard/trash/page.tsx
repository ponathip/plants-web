"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api"

export default function TrashPage() {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState<number[]>([]);

  async function load() {
    const res = await api("/audit-logs?action=delete");
    setLogs(Array.isArray(res) ? res : res.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  }

  async function restoreOne(id: number) {
    await api(`/audit-logs/${id}/restore`, { method: "POST" });
    load();
  }

  async function restoreBulk() {
    const body = { ids: selected }
    const res = await api(`/audit-logs/bulk-restore`, {
      method: "POST",
      body: JSON.stringify(body),
    })

    if (res?.skippedCount > 0) {
      console.log("skipped:", res.skipped)
    }

    setSelected([])
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">🗑️ ถังขยะ</h1>

      {selected.length > 0 && (
        <button
          onClick={restoreBulk}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          กู้คืน {selected.length} รายการ
        </button>
      )}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-x-auto">
            <table className="w-full text-sm border">
                <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                <tr className="border-t dark:border-gray-700">
                    <th className="p-3"></th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">เวลา</th>
                    <th className="p-3"></th>
                </tr>
                </thead>

                <tbody>
                {logs.map((row: any) => (
                    <tr key={row.id} className="border-t">
                    <td className="p-3">
                        <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => toggle(row.id)}
                        />
                    </td>

                    <td className="p-3">{row.entity}</td>
                    <td className="p-3">{row.entity_id}</td>
                    <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>

                    <td className="p-3">
                        <button
                        onClick={() => restoreOne(row.id)}
                        className="px-2 py-1 text-xs rounded bg-blue-500 text-white"
                        >
                        Restore
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}