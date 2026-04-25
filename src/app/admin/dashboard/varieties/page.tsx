"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { useGarden } from "@/context/GardenContext"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"

type VarietyRow = {
  variety_id: number | null
  variety_name: string | null
  species_name: string | null
  sale_item_count: number
  qty_sold: number
  revenue_total: number
  cost_total: number
  profit_total: number
}

export default function VarietyDashboardPage() {
//   const { gardenId } = useGarden()
  const gardenId = 1

  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const formatDate = (d: Date) => d.toISOString().slice(0, 10)

  const [from, setFrom] = useState(formatDate(firstDay))
  const [to, setTo] = useState(formatDate(today))

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<VarietyRow[]>([])

  const loadData = async () => {
    if (!gardenId) return

    setLoading(true)
    try {
      const res = await api(
        `/dashboard/${gardenId}/dashboard/by-variety?from=${from}&to=${to}`
      )

      setRows(
        (res || []).map((row: any) => ({
          variety_id: row.variety_id,
          variety_name: row.variety_name,
          species_name: row.species_name,
          sale_item_count: Number(row.sale_item_count || 0),
          qty_sold: Number(row.qty_sold || 0),
          revenue_total: Number(row.revenue_total || 0),
          cost_total: Number(row.cost_total || 0),
          profit_total: Number(row.profit_total || 0),
        }))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [gardenId, from, to])

  const topProfitChart = useMemo(() => {
    return rows.slice(0, 10).map((row) => ({
      name: row.variety_name || "ไม่ระบุสายพันธุ์",
      profit: row.profit_total,
      revenue: row.revenue_total,
    }))
  }, [rows])

  const topQtyChart = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.qty_sold - a.qty_sold)
      .slice(0, 10)
      .map((row) => ({
        name: row.variety_name || "ไม่ระบุสายพันธุ์",
        qty: row.qty_sold,
      }))
  }, [rows])

  const totalRevenue = useMemo(
    () => rows.reduce((sum, row) => sum + row.revenue_total, 0),
    [rows]
  )

  const totalCost = useMemo(
    () => rows.reduce((sum, row) => sum + row.cost_total, 0),
    [rows]
  )

  const totalProfit = useMemo(
    () => rows.reduce((sum, row) => sum + row.profit_total, 0),
    [rows]
  )

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">🌿 Dashboard ตามสายพันธุ์</h1>
          <p className="text-sm text-gray-500">
            ดูว่าสายพันธุ์ไหนขายดี รายได้ดี และกำไรมากที่สุด
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">จากวันที่</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">กำลังโหลดข้อมูล...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">รายได้รวม</p>
          <p className="text-2xl font-semibold text-green-600">
            {totalRevenue.toLocaleString()} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">ต้นทุนรวม</p>
          <p className="text-2xl font-semibold">
            {totalCost.toLocaleString()} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">กำไรรวม</p>
          <p className="text-2xl font-semibold text-blue-600">
            {totalProfit.toLocaleString()} บาท
          </p>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-4">🏆 Top 10 สายพันธุ์ที่กำไรมากที่สุด</h2>

        <div className="w-full h-80">
          <ResponsiveContainer>
            <BarChart data={topProfitChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" name="กำไร" />
              <Bar dataKey="revenue" name="รายได้" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-4">📦 Top 10 สายพันธุ์ที่ขายจำนวนมากที่สุด</h2>

        <div className="w-full h-80">
          <ResponsiveContainer>
            <BarChart data={topQtyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="qty" name="จำนวนที่ขาย" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-4">📋 รายงานตามสายพันธุ์</h2>

        {rows.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่มีข้อมูลในช่วงนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">ชนิดพืช</th>
                  <th className="p-3">สายพันธุ์</th>
                  <th className="p-3">จำนวนขาย</th>
                  <th className="p-3">รายได้</th>
                  <th className="p-3">ต้นทุน</th>
                  <th className="p-3">กำไร</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.variety_id}-${row.variety_name}`} className="border-b">
                    <td className="p-3">{row.species_name || "-"}</td>
                    <td className="p-3 font-medium">{row.variety_name || "-"}</td>
                    <td className="p-3">{row.qty_sold}</td>
                    <td className="p-3">{row.revenue_total.toLocaleString()} บาท</td>
                    <td className="p-3">{row.cost_total.toLocaleString()} บาท</td>
                    <td className="p-3 text-blue-600 font-semibold">
                      {row.profit_total.toLocaleString()} บาท
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}