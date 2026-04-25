// components/Header.tsx
export default function Header() {
  return (
    <header className="flex items-center justify-between p-6 border-b bg-white">
      <div>
        <h1 className="text-2xl font-bold">🌱 ระบบจัดการสวน</h1>
        <p className="text-sm text-gray-500">ภาพรวมการจัดการสวน</p>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary">+ ซื้อพันธุ์ไม้</button>
        <button className="btn-outline">+ ขยายพันธุ์</button>
      </div>
    </header>
  )
}
