"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export default function PlantLineChart({ data }: any) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />

          <Line type="monotone" dataKey="alive" stroke="#22c55e" />
          <Line type="monotone" dataKey="sold" stroke="#3b82f6" />
          <Line type="monotone" dataKey="dead" stroke="#ef4444" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}