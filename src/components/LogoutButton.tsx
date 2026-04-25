// components/LogoutButton.tsx
"use client"

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout")
    window.location.href = "/login"
  }

  return (
    <button
      onClick={logout}
      className="text-sm text-red-600"
    >
      ออกจากระบบ
    </button>
  )
}
