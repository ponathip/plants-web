export default function ForbiddenPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">403 Forbidden</h1>
        <p className="text-gray-500 mt-2">
          คุณไม่มีสิทธิ์เข้าหน้านี้
        </p>
      </div>
    </div>
  )
}