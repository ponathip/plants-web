"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { useGarden } from "@/context/GardenContext"
import { useUser } from "@/context/UserContext"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"

type Garden = {
  id: number
  name: string
}

type ProfitSummary = {
  revenue_total: number
  cost_total: number
  gross_profit_total: number
  expense_total: number
  net_profit_total: number
  sale_count: number
}

type DailyRow = {
  date: string
  revenue_total: number
  cost_total: number
  gross_profit_total: number
  expense_total: number
  net_profit_total: number
  sale_count: number
}

type RecentSale = {
  id: number
  buyer_name: string | null
  channel: string | null
  grand_total: number
  sold_at: string | null
}

type RecentExpense = {
  id: number
  category: string | null
  title: string
  amount: number
  expense_date: string | null
}

type StockSummary = {
  total: number
  alive: number
  sold: number
  dead: number
}

type VarietyProfitRow = {
  variety_id: number | null
  variety_name: string | null
  species_name: string | null
  qty_sold: number
  revenue_total: number
  cost_total: number
  profit_total: number
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

const CHART_COLORS = {
  revenue: "#06b39c",
  grossProfit: "#2563eb",
  expense: "#f97316",
  netProfit: "#10b981",
  alive: "#22c55e",
  sold: "#3b82f6",
  dead: "#ef4444",
}

function formatMoney(value?: number | string | null) {
  return Number(value || 0).toLocaleString("th-TH")
}

function getDefaultRange() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

  const formatDate = (d: Date) => d.toISOString().slice(0, 10)

  return {
    from: formatDate(firstDay),
    to: formatDate(today),
  }
}

export default function DashboardPage() {
  const { user, loadingUser } = useUser()
  const { gardenId } = useGarden()
  const isSuper = user?.role === "super"

  const defaultRange = useMemo(() => getDefaultRange(), [])

  const [gardens, setGardens] = useState<Garden[]>([])
  const [selectedGardenId, setSelectedGardenId] = useState("")

  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [profitSummary, setProfitSummary] = useState<ProfitSummary>({
    revenue_total: 0,
    cost_total: 0,
    gross_profit_total: 0,
    expense_total: 0,
    net_profit_total: 0,
    sale_count: 0,
  })

  const [daily, setDaily] = useState<DailyRow[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([])
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    total: 0,
    alive: 0,
    sold: 0,
    dead: 0,
  })
  const [varietyProfitRows, setVarietyProfitRows] = useState<VarietyProfitRow[]>([])
  const [stockRows, setStockRows] = useState<StockRow[]>([])

  const loadGardens = async () => {
    try {
      const res = await api("/gardens")
      setGardens(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      console.error("loadGardens error:", err)
    }
  }

  const buildQuery = () => {
    const params = new URLSearchParams()

    if (from) params.set("from", from)
    if (to) params.set("to", to)

    if (isSuper && selectedGardenId) {
      params.set("garden_id", selectedGardenId)
    }

    return params.toString()
  }

  const loadDashboard = async () => {
    setLoading(true)
    setError("")

    try {
      const query = buildQuery()
      const suffix = query ? `?${query}` : ""

      const [profitRes, stockSummaryRes, stockRowsRes, varietyProfitRes] =
        await Promise.all([
          api(`/dashboard/profit${suffix}`),
          api(`/dashboard/stock-summary${suffix}`),
          api(`/dashboard/stock-by-variety${suffix}`),
          api(`/dashboard/by-variety${suffix}`),
        ])

      setProfitSummary({
        revenue_total: Number(profitRes?.summary?.revenue_total || 0),
        cost_total: Number(profitRes?.summary?.cost_total || 0),
        gross_profit_total: Number(profitRes?.summary?.gross_profit_total || 0),
        expense_total: Number(profitRes?.summary?.expense_total || 0),
        net_profit_total: Number(profitRes?.summary?.net_profit_total || 0),
        sale_count: Number(profitRes?.summary?.sale_count || 0),
      })

      setDaily(
        (profitRes?.daily || []).map((row: any) => ({
          date: row.date
            ? new Date(row.date).toLocaleDateString("th-TH")
            : "-",
          revenue_total: Number(row.revenue_total || 0),
          cost_total: Number(row.cost_total || 0),
          gross_profit_total: Number(row.gross_profit_total || 0),
          expense_total: Number(row.expense_total || 0),
          net_profit_total: Number(row.net_profit_total || 0),
          sale_count: Number(row.sale_count || 0),
        }))
      )

      setRecentSales(
        (profitRes?.recentSales || []).map((row: any) => ({
          id: row.id,
          buyer_name: row.buyer_name,
          channel: row.channel,
          grand_total: Number(row.grand_total || 0),
          sold_at: row.sold_at,
        }))
      )

      setRecentExpenses(
        (profitRes?.recentExpenses || []).map((row: any) => ({
          id: row.id,
          category: row.category,
          title: row.title,
          amount: Number(row.amount || 0),
          expense_date: row.expense_date,
        }))
      )

      setStockSummary({
        total: Number(stockSummaryRes?.total || 0),
        alive: Number(stockSummaryRes?.alive || 0),
        sold: Number(stockSummaryRes?.sold || 0),
        dead: Number(stockSummaryRes?.dead || 0),
      })

      setStockRows(
        (stockRowsRes || []).map((row: any) => ({
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

      setVarietyProfitRows(
        (varietyProfitRes || []).map((row: any) => ({
          variety_id: row.variety_id,
          variety_name: row.variety_name,
          species_name: row.species_name,
          qty_sold: Number(row.qty_sold || 0),
          revenue_total: Number(row.revenue_total || 0),
          cost_total: Number(row.cost_total || 0),
          profit_total: Number(row.profit_total || 0),
        }))
      )
    } catch (err: any) {
      console.error(err)
      setError(err.message || "โหลด dashboard ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loadingUser) return

    if (isSuper) {
      loadGardens()
      setSelectedGardenId("")
    } else {
      setSelectedGardenId(String(gardenId || ""))
    }
  }, [loadingUser, isSuper, gardenId])

  useEffect(() => {
    if (loadingUser) return
    loadDashboard()
  }, [loadingUser, isSuper, selectedGardenId, from, to, gardenId])

  const avgNetProfitPerSale = useMemo(() => {
    if (!profitSummary.sale_count) return 0
    return profitSummary.net_profit_total / profitSummary.sale_count
  }, [profitSummary])

  const pieData = useMemo(() => {
    return [
      { name: "คงเหลือ", value: stockSummary.alive },
      { name: "ขายแล้ว", value: stockSummary.sold },
      { name: "เสีย/ตาย", value: stockSummary.dead },
    ]
  }, [stockSummary])

  const topProfitChart = useMemo(() => {
    return varietyProfitRows.slice(0, 8).map((row) => ({
      name: row.variety_name || row.species_name || "ไม่ระบุ",
      profit: row.profit_total,
    }))
  }, [varietyProfitRows])

  const topAliveChart = useMemo(() => {
    return stockRows.slice(0, 8).map((row) => ({
      name: row.variety_name || row.species_name || "ไม่ระบุ",
      alive: row.alive_count,
    }))
  }, [stockRows])

  const lowStockRows = useMemo(() => {
    return stockRows
      .filter((row) => row.alive_count > 0 && row.alive_count <= 3)
      .sort((a, b) => a.alive_count - b.alive_count)
      .slice(0, 5)
  }, [stockRows])

  const alertCards = useMemo(() => {
    const cards: {
      title: string
      message: string
      tone: "warning" | "danger"
    }[] = []

    if (profitSummary.net_profit_total < 0) {
      cards.push({
        title: "ขาดทุนสุทธิ",
        message: `ช่วงเวลานี้ขาดทุนสุทธิ ${formatMoney(
          Math.abs(profitSummary.net_profit_total)
        )} บาท`,
        tone: "danger",
      })
    }

    if (
      profitSummary.revenue_total > 0 &&
      profitSummary.expense_total / profitSummary.revenue_total >= 0.3
    ) {
      cards.push({
        title: "ค่าใช้จ่ายสูงผิดปกติ",
        message: `ค่าใช้จ่ายคิดเป็น ${(
          (profitSummary.expense_total / profitSummary.revenue_total) *
          100
        ).toFixed(1)}% ของรายรับ`,
        tone: "warning",
      })
    }

    if (
      profitSummary.gross_profit_total > 0 &&
      profitSummary.expense_total > profitSummary.gross_profit_total
    ) {
      cards.push({
        title: "ค่าใช้จ่ายสูงกว่ากำไรขั้นต้น",
        message: "กำไรจากการขายถูกค่าใช้จ่ายอื่นกลบหมดแล้ว",
        tone: "danger",
      })
    }

    if (lowStockRows.length >= 3) {
      cards.push({
        title: "หลายสายพันธุ์ใกล้หมด",
        message: `มี ${lowStockRows.length} สายพันธุ์ที่คงเหลือน้อย`,
        tone: "warning",
      })
    }

    return cards
  }, [profitSummary, lowStockRows])

  const moneyTooltipFormatter = (value: any) =>
    `${Number(value || 0).toLocaleString("th-TH")} บาท`

  if (loadingUser) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
        <div className="text-sm text-gray-500">กำลังโหลดข้อมูลผู้ใช้...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">📊 Dashboard ภาพรวมธุรกิจ</h1>
          <p className="text-sm text-gray-500">
            รายได้ ต้นทุน ค่าใช้จ่าย กำไรสุทธิ stock และสายพันธุ์สำคัญ
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isSuper && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">สวน</label>
              <select
                value={selectedGardenId}
                onChange={(e) => setSelectedGardenId(e.target.value)}
                className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
              >
                <option value="">ทุกสวน</option>
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">รายได้รวม</p>
          <p className="text-2xl font-semibold text-green-600">
            {formatMoney(profitSummary.revenue_total)} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">ต้นทุนรวม</p>
          <p className="text-2xl font-semibold">
            {formatMoney(profitSummary.cost_total)} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">กำไรขั้นต้น</p>
          <p className="text-2xl font-semibold text-blue-600">
            {formatMoney(profitSummary.gross_profit_total)} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">ค่าใช้จ่าย</p>
          <p className="text-2xl font-semibold text-orange-600">
            {formatMoney(profitSummary.expense_total)} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">กำไรสุทธิ</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {formatMoney(profitSummary.net_profit_total)} บาท
          </p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500">บิลขาย</p>
          <p className="text-2xl font-semibold">
            {profitSummary.sale_count.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            กำไรสุทธิเฉลี่ย/บิล {formatMoney(avgNetProfitPerSale)} บาท
          </p>
        </div>
      </div>

      {alertCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertCards.map((card, index) => (
            <div
              key={index}
              className={`rounded-xl border p-4 ${
                card.tone === "danger"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-orange-200 bg-orange-50 text-orange-700"
              }`}
            >
              <div className="font-semibold">{card.title}</div>
              <div className="text-sm mt-1">{card.message}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">📈 รายได้ / กำไร / ค่าใช้จ่ายรายวัน</h2>

          <div className="w-full h-80">
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={moneyTooltipFormatter} 
                  contentStyle={{
                    backgroundColor: "#1f2937", // dark bg
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e5e7eb" }} // วันที่ / label
                  itemStyle={{ color: "#e5e7eb" }}  // text ด้านใน
                  />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue_total"
                  name="รายได้"
                  stroke={CHART_COLORS.revenue}
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="gross_profit_total"
                  name="กำไรขั้นต้น"
                  stroke={CHART_COLORS.grossProfit}
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="expense_total"
                  name="ค่าใช้จ่าย"
                  stroke={CHART_COLORS.expense}
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="net_profit_total"
                  name="กำไรสุทธิ"
                  stroke={CHART_COLORS.netProfit}
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">🥧 สถานะ stock</h2>

          <div className="w-full h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {pieData.map((entry, index) => {
                    const colorMap = {
                      คงเหลือ: CHART_COLORS.alive,
                      ขายแล้ว: CHART_COLORS.sold,
                      "เสีย/ตาย": CHART_COLORS.dead,
                    } as Record<string, string>

                    return <Cell key={index} fill={colorMap[entry.name]} />
                  })}
                </Pie>
                <Tooltip
                  formatter={(value: any) =>
                    Number(value || 0).toLocaleString("th-TH")
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">🏆 สายพันธุ์กำไรมากสุด</h2>

          <div className="w-full h-80">
            <ResponsiveContainer>
              <BarChart data={topProfitChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={moneyTooltipFormatter} 
                  contentStyle={{
                    backgroundColor: "#1f2937", // dark bg
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e5e7eb" }} // วันที่ / label
                  itemStyle={{ color: "#e5e7eb" }}  // text ด้านใน
                  />
                <Legend />
                <Bar
                  dataKey="profit"
                  name="กำไร"
                  fill={CHART_COLORS.grossProfit}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">📦 สายพันธุ์เหลือมากสุด</h2>

          <div className="w-full h-80">
            <ResponsiveContainer>
              <BarChart data={topAliveChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) =>
                    Number(value || 0).toLocaleString("th-TH")
                  }
                  contentStyle={{
                    backgroundColor: "#1f2937", // dark bg
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e5e7eb" }} // วันที่ / label
                  itemStyle={{ color: "#e5e7eb" }}  // text ด้านใน
                />
                <Legend />
                <Bar
                  dataKey="alive"
                  name="คงเหลือ"
                  fill={CHART_COLORS.alive}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">⚠️ สายพันธุ์ใกล้หมด</h2>

          {lowStockRows.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีสายพันธุ์ที่ใกล้หมด</div>
          ) : (
            <div className="space-y-3">
              {lowStockRows.map((row) => (
                <div
                  key={`${row.species_id}-${row.variety_id}`}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {row.variety_name || "ไม่ระบุสายพันธุ์"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {row.species_name || "-"}
                    </p>
                  </div>

                  <div className="text-orange-600 font-semibold">
                    เหลือ {row.alive_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">💰 รายการขายล่าสุด</h2>

          {recentSales.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีรายการขายในช่วงนี้</div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {sale.buyer_name || "ไม่ระบุผู้ซื้อ"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {sale.channel || "-"} •{" "}
                      {sale.sold_at
                        ? new Date(sale.sold_at).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  <div className="font-semibold text-green-600">
                    {formatMoney(sale.grand_total)} บาท
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">💸 ค่าใช้จ่ายล่าสุด</h2>

          {recentExpenses.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีค่าใช้จ่ายในช่วงนี้</div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-sm text-gray-500">
                      {exp.category || "-"} •{" "}
                      {exp.expense_date
                        ? new Date(exp.expense_date).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  <div className="font-semibold text-orange-600">
                    {formatMoney(exp.amount)} บาท
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 overflow-x-auto">
          <h2 className="font-semibold mb-4">📦 stock ตามสายพันธุ์</h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">ชนิดพืช</th>
                <th className="text-left py-2">สายพันธุ์</th>
                <th className="text-right py-2">ทั้งหมด</th>
                <th className="text-right py-2">คงเหลือ</th>
                <th className="text-right py-2">ขายแล้ว</th>
                <th className="text-right py-2">ตาย</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.slice(0, 10).map((row, index) => (
                <tr
                  key={`${row.species_id}-${row.variety_id}-${index}`}
                  className="border-b"
                >
                  <td className="py-2">{row.species_name || "-"}</td>
                  <td className="py-2">{row.variety_name || "-"}</td>
                  <td className="py-2 text-right">
                    {row.total_count.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-green-600">
                    {row.alive_count.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-blue-600">
                    {row.sold_count.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-red-600">
                    {row.dead_count.toLocaleString()}
                  </td>
                </tr>
              ))}

              {stockRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}