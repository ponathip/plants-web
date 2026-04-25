"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext"
import { api } from "@/lib/api";

import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loadingUser } = useUser()
  const isSuper = user?.role === "super"

  // load theme + check auth
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }

    // 🔐 simple auth guard (phase 1)
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken")

      await api("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
    } catch (e) {
      console.log("logout error", e)
    }

    // 🔥 ล้าง local token
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")

    router.replace("/login")
  }

  const Menu = () => (
    <nav className="flex-1 p-4 space-y-2">
      <Link
        href="/admin/dashboard"
        className={`block px-3 py-2 rounded transition ${pathname === "/admin/dashboard" ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        📊 Dashboard
      </Link>
      <Link
        href="/admin/members"
        className={`block px-3 py-2 rounded transition ${pathname === "/admin/members" ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        👥 สมาชิก
      </Link>
      <Link
        href="/admin/suppliers"
        className={`block px-3 py-2 rounded transition ${pathname === "/admin/suppliers" ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        🏪 ร้านผู้จำหน่าย
      </Link>
      <Link
        href="/admin/varieties"
        className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/varieties") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        🌿 สายพันธุ์พืช
      </Link>
      <Link
        href="/admin/plants"
        className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/plants") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        🌱 จัดการต้นพืช
      </Link>
      <Link
        href="/admin/purchases"
        className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/purchases") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        🛒 จัดการซื้อ
      </Link>
      <Link
        href="/admin/sales"
        className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/sales") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        💰 จัดการขาย
      </Link>
      <Link
        href="/admin/expenses"
        className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/expenses") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
      >
        💸 ค่าใช้จ่าย
      </Link>
      {user?.role === "super" && (
        <Link
          href="/admin/audit-logs"
          className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/audit-logs") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
        >
        📜 Logs
        </Link>
      )}
      {user?.role === "super" && (
        <Link
          href="/admin/dashboard/trash"
          className={`block px-3 py-2 rounded transition ${pathname.startsWith("/admin/dashboard/trash") ? "bg-green-900 dark:bg-green-700 font-semibold" : "hover:bg-green-700 dark:hover:bg-green-600"}`}
        >
         🗑️ ถังขยะ
        </Link>
      )}
    </nav>
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">กำลังตรวจสอบสิทธิ์...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-green-800 dark:bg-green-900 text-white flex-col">
        <div className="p-4 text-xl font-bold border-b border-green-700 dark:border-green-800">
         <img
            src="/logo.jpg"
            alt="logo"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <Menu />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed z-50 top-0 left-0 h-full w-64 bg-green-800 dark:bg-green-900 text-white flex flex-col transform transition-transform md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 text-xl font-bold border-b border-green-700 dark:border-green-800 flex justify-between items-center">
          🌱 Garden Admin
          <button onClick={() => setOpen(false)}>✕</button>
        </div>
        <Menu />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-gray-800 shadow flex items-center justify-between px-4">
          <button className="md:hidden text-xl" onClick={() => setOpen(true)}>☰</button>
          <div className="font-semibold text-gray-800 dark:text-gray-100">Admin Panel</div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDark}
              className="px-2 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700"
            >
              {dark ? "🌙" : "☀️"}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Logout
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-300">Ponathip</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto text-gray-800 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
