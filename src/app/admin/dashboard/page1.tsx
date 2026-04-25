"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip
} from "recharts"
// import { useGarden } from "@/context/GardenContext"
import PlantLineChart from "@/components/PlantLineChart"

const COLORS = ["#22c55e", "#eab308", "#ef4444"]
// import { toastSuccess, toastError } from "@/lib/toast"

type Plant = {
  id?: number
  name: string
  status: "alive" | "sold" | "dead"
  species_id: string
  garden_id: string
}

export default function DashboardPage() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [overview, setOverview] = useState<any>({})
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | Plant["status"]>("all")
  
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const [audits, setAudits] = useState([])
  const [from, setFrom] = useState("2026-04-01")
  const [to, setTo] = useState("2026-04-31")
  // const { gardenId } = useGarden()
  const gardenId = 1
  const loadAudits = async () => {
    const data = await api(`/gardens/plants/audits`)
    setAudits(data)
  }

  const loadOverview = async () => {
    const data = await api(`/gardens/plants/overview?from=${from}&to=${to}`)
    setOverview(data)
  }

  const loadStats = async () => {
    const res = await api(
      `/gardens/${gardenId}/dashboard/stats?from=${from}&to=${to}`
    )

    const formatted = res.map((r: any) => ({
      date: r.date,
      alive: Number(r.alive),
      sold: Number(r.sold),
      dead: Number(r.dead),
    }))

    setData(formatted)
  }

  const chartData = Object.entries(overview)
  .filter(([key]) => key !== "total")
  .map(([key, value]) => ({
    name: key,
    value: Number(value)
  }))

  const loadPlants = async () => {
    try {
      setLoading(true)
      setError("")
      const params = new URLSearchParams({
        search,
        status: filter,
        page: page.toString(),
        limit: limit.toString(),
      })
      const data = await api(`/plants?${params.toString()}`)
      setPlants(Array.isArray(data) ? data : data.data || [])
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlants()
    loadOverview()
    loadStats()
    loadAudits()
  }, [search, page, filter])

  const stats = [
    { title: "สายพันธุ์พืช", value: 12, icon: "🌿", color: "bg-green-100 text-green-700" },
    { title: "ต้นพืชในสวน", value: 86, icon: "🌱", color: "bg-lime-100 text-lime-700" },
    { title: "รายการซื้อ", value: 24, icon: "🛒", color: "bg-amber-100 text-amber-700" },
    { title: "ต้นทุนรวม (บาท)", value: "18,450", icon: "💸", color: "bg-rose-100 text-rose-700" },
  ];

  const formatAudit = (a: any) => {
    const actionMap: any = {
      create: "➕ เพิ่ม",
      update: "✏️ แก้ไข",
      delete: "🗑️ ลบ",
    }

    return `${actionMap[a.action] || a.action} ${a.entity}`
  }

  const actionColor: any = {
    create: "text-green-500",
    update: "text-yellow-500",
    delete: "text-red-500",
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <p className="text-gray-500">ภาพรวมระบบจัดการสวน</p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={loadStats}
          className="bg-blue-500 text-white px-3 rounded"
        >
          โหลด
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl shadow p-5 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-gray-500">{item.title}</p>
              <p className="text-2xl font-bold mt-1">{item.value}</p>
            </div>
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl ${item.color}`}
            >
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="p-4 bg-slate-800 rounded">
          <p className="text-sm text-gray-400">ทั้งหมด</p>
          <p className="text-2xl font-bold">{overview.total}</p>
        </div>

        <div className="p-4 bg-green-900 rounded">
          <p>Alive</p>
          <p className="text-2xl">{overview.alive}</p>
        </div>

        <div className="p-4 bg-yellow-700 rounded">
          <p>Sold</p>
          <p className="text-2xl">{overview.sold}</p>
        </div>

        <div className="p-4 bg-red-900 rounded">
          <p>Dead</p>
          <p className="text-2xl">{overview.dead}</p>
        </div>

      </div>

      {/* Placeholder Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold mb-4">📈 กิจกรรมล่าสุด</h2>
          <ul className="space-y-3 text-sm">
              {audits.map((a: any) => (
                <li key={a.id} className="flex justify-between">
                  <span className={actionColor[a.action]}>
                    <b>{a.user_name}</b> {formatAudit(a)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold mb-4">🧭 สิ่งที่ควรทำต่อ</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• เพิ่มสายพันธุ์พืช</li>
            <li>• บันทึกการซื้อเข้า</li>
            <li>• เช็กสถานะต้นพืช</li>
          </ul>
        </div>
      </div>
      <h2 className="font-semibold mb-4">📊 สถานะพืช</h2>    
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded">
          🌱 Alive: {chartData[0]?.value}
        </div>
        <div className="bg-blue-100 p-4 rounded">
          💰 Sold: {chartData[1]?.value}
        </div>
        <div className="bg-red-100 p-4 rounded">
          ☠️ Dead: {chartData[2]?.value}
        </div>
      </div>    
      <PieChart width={300} height={300}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>

      <PlantLineChart data={data} />
    </div>
  );
}
