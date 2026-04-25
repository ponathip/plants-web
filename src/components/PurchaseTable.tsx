// components/PurchaseTable.tsx
export default function PurchaseTable() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold mb-4">การซื้อล่าสุด</h2>
      <table className="w-full text-sm">
        <thead className="text-gray-500">
          <tr>
            <th>วันที่</th>
            <th>สายพันธุ์</th>
            <th>ร้าน</th>
            <th>ราคา</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td>12/01/2026</td>
            <td>ทุเรียนหมอนทอง</td>
            <td>สวนลุงแดง</td>
            <td>฿450</td>
            <td className="text-green-600">ปกติ</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
