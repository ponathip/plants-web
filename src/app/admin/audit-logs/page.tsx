"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useUser } from "@/context/UserContext"

type AuditRow = {
  id: number
  garden_id?: number | null
  user_id?: number | null
  action: string
  entity: string
  entity_id: number
  created_at: string
  user_name?: string | null
  user_email?: string | null
  garden_name?: string | null
}

type AuditDetail = AuditRow & {
  old_data?: any
  new_data?: any
  meta?: any
}

export default function AuditLogsPage() {
  const { user, loadingUser } = useUser()
  const isSuper = user?.role === "super"

  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date()
  firstDay.setDate(1)
  const firstDayText = firstDay.toISOString().slice(0, 10)

  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  const [search, setSearch] = useState("")
  const [entity, setEntity] = useState("all")
  const [action, setAction] = useState("all")
  const [from, setFrom] = useState(firstDayText)
  const [to, setTo] = useState(today)

  const [detail, setDetail] = useState<AuditDetail | null>(null)
  const [openDetail, setOpenDetail] = useState(false)

  const loadAuditLogs = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        entity,
        action,
      })

      if (from) params.set("from", from)
      if (to) params.set("to", to)

      const res = await api(`/audit-logs?${params.toString()}`)
      setRows(Array.isArray(res) ? res : res.data || [])
      setTotal(Number(res?.total || 0))
    } catch (err) {
      console.error(err)
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async (id: number) => {
    try {
      const res = await api(`/audit-logs/${id}`)
      setDetail(res || null)
      setOpenDetail(true)
    } catch (err: any) {
      alert(err.message || "โหลดรายละเอียดไม่สำเร็จ")
    }
  }

  const handleRestore = async (row: AuditRow) => {
    const ok = confirm(
      `ต้องการกู้คืน ${row.entity} #${row.entity_id} จาก log นี้หรือไม่?`
    )
    if (!ok) return

    try {
      setRestoringId(row.id)
      await api(`/audit-logs/${row.id}/restore`, {
        method: "POST",
      })
      await loadAuditLogs()
      if (detail?.id === row.id) {
        setOpenDetail(false)
        setDetail(null)
      }
      alert("กู้คืนสำเร็จ")
    } catch (err: any) {
      alert(err.message || "restore ไม่สำเร็จ")
    } finally {
      setRestoringId(null)
    }
  }

  useEffect(() => {
    if (loadingUser) return
    if (!isSuper) return
    loadAuditLogs()
  }, [loadingUser, isSuper, page, search, entity, action, from, to])

  if (loadingUser) {
    return <div className="p-6">กำลังโหลดข้อมูลผู้ใช้...</div>
  }

  if (!isSuper) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้
        </div>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">📜 Logs</h1>
          {/* <p className="text-sm text-gray-500">
            สำหรับ super เท่านั้น
          </p> */}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
          placeholder="ค้นหา user / Table / action / id"
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <select
          value={entity}
          onChange={(e) => {
            setPage(1)
            setEntity(e.target.value)
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="all">ทุก Table</option>
          <option value="plants">plants</option>
          <option value="plant_timelines">plant_timelines</option>
          <option value="plant_varieties">plant_varieties</option>
          <option value="suppliers">suppliers</option>
          <option value="purchases">purchases</option>
          <option value="purchase_items">purchase_items</option>
          <option value="expenses">expenses</option>
          <option value="sales">sales</option>
          <option value="garden_members">garden_members</option>
          <option value="gardens">gardens</option>
          <option value="invites">invites</option>
        </select>

        <select
          value={action}
          onChange={(e) => {
            setPage(1)
            setAction(e.target.value)
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="all">ทุก action</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="restore">restore</option>
          <option value="invite">invite</option>
          <option value="accept_invite">accept_invite</option>
          <option value="update_role">update_role</option>
          <option value="export">export</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => {
            setPage(1)
            setFrom(e.target.value)
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => {
            setPage(1)
            setTo(e.target.value)
          }}
          className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="text-left px-4 py-3">เวลา</th>
              <th className="text-left px-4 py-3">ผู้ใช้</th>
              <th className="text-left px-4 py-3">สวน</th>
              <th className="text-left px-4 py-3">Table</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-gray-500">
                  กำลังโหลด...
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const canRestore = row.action === "delete"

              return (
                <tr key={row.id} className="border-b">
                  <td className="px-4 py-3">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.user_name || "-"}</div>
                    <div className="text-xs text-gray-500">{row.user_email || "-"}</div>
                  </td>
                  <td className="px-4 py-3">{row.garden_name || "-"}</td>
                  <td className="px-4 py-3">{row.entity}</td>
                  <td className="px-4 py-3">{row.action}</td>
                  <td className="px-4 py-3">{row.entity_id}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadDetail(row.id)}
                        className="px-3 py-1 rounded bg-blue-600 text-white"
                      >
                        ดูรายละเอียด
                      </button>

                      {canRestore && (
                        <button
                          onClick={() => handleRestore(row)}
                          disabled={restoringId === row.id}
                          className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                        >
                          {restoringId === row.id ? "กำลังกู้คืน..." : "Restore"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          ทั้งหมด {total.toLocaleString()} รายการ
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ก่อนหน้า
          </button>

          <span className="text-sm">
            หน้า {page} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {openDetail && detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-auto max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">รายละเอียด Log</h2>
              <div className="flex gap-2">
                {detail.action === "delete" && (
                  <button
                    onClick={() => handleRestore(detail)}
                    disabled={restoringId === detail.id}
                    className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                  >
                    {restoringId === detail.id ? "กำลังกู้คืน..." : "Restore"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setOpenDetail(false)
                    setDetail(null)
                  }}
                  className="px-3 py-1 border rounded"
                >
                  ปิด
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div><b>ID:</b> {detail.id}</div>
              <div><b>Table:</b> {detail.entity}</div>
              <div><b>Action:</b> {detail.action}</div>
              <div><b>Table ID:</b> {detail.entity_id}</div>
              <div><b>User:</b> {detail.user_name || "-"}</div>
              <div><b>Garden:</b> {detail.garden_name || "-"}</div>
              <div className="md:col-span-3">
                <b>เวลา:</b>{" "}
                {detail.created_at
                  ? new Date(detail.created_at).toLocaleString()
                  : "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium mb-2">ข้อมูลก่อนหน้า</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(detail.old_data ?? null, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">ข้อมูลใหม่</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(detail.new_data ?? null, null, 2)}
                </pre>
              </div>

              {/* <div>
                <h3 className="font-medium mb-2">meta</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(detail.meta ?? null, null, 2)}
                </pre>
              </div> */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}