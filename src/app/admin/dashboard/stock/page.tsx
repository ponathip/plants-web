"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { useGarden } from "@/context/GardenContext"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"

type StockSummary = {
  total: number
  alive: number
  sold: number
  dead: number
}

type StockRow = {
  species_id: number | null
  species_name: string | null
  variety_id: number | null
  variety_name: string | null
  total_count: number
  alive_count: number
  sold_count: number
  dead_count: number
}

export default function StockDashboardPage() {
//   const { gardenId } = useGarden()
const gardenId = 1

  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<StockSummary>({
    total: 0,
    alive: 0,
    sold: 0,
    dead: 0,
  })
  const [rows, setRows] = useState<StockRow[]>([])

  const loadData = async () => {
    if (!gardenId) return

    setLoading(true)
    try {
      const [summaryRes, rowsRes] = await Promise.all([
        api(`/dashboard/${gardenId}/dashboard/stock-summary`),
        api(`/dashboard/${gardenId}/dashboard/stock-by-variety`),
      ])

      setSummary({
        total: Number(summaryRes?.total || 0),
        alive: Number(summaryRes?.alive || 0),
        sold: Number(summaryRes?.sold || 0),
        dead: Number(summaryRes?.dead || 0),
      })

      setRows(
        (rowsRes || []).map((row: any) => ({
          species_id: row.species_id,
          species_name: row.species_name,
          variety_id: row.variety_id,
          variety_name: row.variety_name,
          total_count: Number(row.total_count || 0),
          alive_count: Number(row.alive_count || 0),
          sold_count: Number(row.sold_count || 0),
          dead_count: Number(row.dead_count || 0),
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
  }, [gardenId])

  const pieData = useMemo(() => {
    return [
      { name: "คงเหลือ", value: summary.alive },
      { name: "ขายแล้ว", value: summary.sold },
      { name: "เสีย/ตาย", value: summary.dead },
    ]
  }, [summary])

  const topAliveChart = useMemo(() => {
    return rows.slice(0, 10).map((row) => ({
      name: row.variety_name || row.species_name || "ไม่ระบุ",
      alive: row.alive_count,
      total: row.total_count,
    }))
  }, [rows])

  const lowStockRows = useMemo(() => {
    return rows
      .filter((row) => row.alive_count > 0 && row.alive_count <= 3)
      .sort((a, b) => a.alive_count - b.alive_count)
  }, [rows])

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div>
        <h1 className="text-xl font-semibold">📦 Dashboard Stock คงเหลือ</h1>
        <p className="text-sm text-gray-500">
          ภาพรวมสต็อกคงเหลือ แยกตามสถานะและสายพันธุ์
        </p>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">กำลังโหลดข้อมูล...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">ทั้งหมด</p>
          <p className="text-2xl font-semibold">{summary.total.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">คงเหลือ</p>
          <p className="text-2xl font-semibold text-green-600">
            {summary.alive.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">ขายแล้ว</p>
          <p className="text-2xl font-semibold text-blue-600">
            {summary.sold.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">เสีย/ตาย</p>
          <p className="text-2xl font-semibold text-red-600">
            {summary.dead.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">🥧 สถานะ stock</h2>

          <div className="w-full h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {pieData.map((_, index) => (
                    <Cell key={index} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">🌿 Top 10 สายพันธุ์ที่เหลือมากที่สุด</h2>

          <div className="w-full h-80">
            <ResponsiveContainer>
              <BarChart data={topAliveChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="alive" name="คงเหลือ" />
                <Bar dataKey="total" name="ทั้งหมด" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-4">⚠️ สายพันธุ์ที่ stock เหลือน้อย</h2>

        {lowStockRows.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่มีสายพันธุ์ที่ใกล้หมด</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">ชนิดพืช</th>
                  <th className="p-3">สายพันธุ์</th>
                  <th className="p-3">คงเหลือ</th>
                  <th className="p-3">ขายแล้ว</th>
                  <th className="p-3">เสีย/ตาย</th>
                  <th className="p-3">ทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {lowStockRows.map((row) => (
                  <tr
                    key={`${row.species_id}-${row.variety_id}`}
                    className="border-b"
                  >
                    <td className="p-3">{row.species_name || "-"}</td>
                    <td className="p-3 font-medium">
                      {row.variety_name || "ไม่ระบุสายพันธุ์"}
                    </td>
                    <td className="p-3 text-orange-600 font-semibold">
                      {row.alive_count}
                    </td>
                    <td className="p-3">{row.sold_count}</td>
                    <td className="p-3">{row.dead_count}</td>
                    <td className="p-3">{row.total_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-4">📋 รายงาน stock ตามสายพันธุ์</h2>

        {rows.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่มีข้อมูล stock</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">ชนิดพืช</th>
                  <th className="p-3">สายพันธุ์</th>
                  <th className="p-3">คงเหลือ</th>
                  <th className="p-3">ขายแล้ว</th>
                  <th className="p-3">เสีย/ตาย</th>
                  <th className="p-3">ทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.species_id}-${row.variety_id}`}
                    className="border-b"
                  >
                    <td className="p-3">{row.species_name || "-"}</td>
                    <td className="p-3 font-medium">
                      {row.variety_name || "ไม่ระบุสายพันธุ์"}
                    </td>
                    <td className="p-3 text-green-600 font-semibold">
                      {row.alive_count}
                    </td>
                    <td className="p-3">{row.sold_count}</td>
                    <td className="p-3">{row.dead_count}</td>
                    <td className="p-3">{row.total_count}</td>
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