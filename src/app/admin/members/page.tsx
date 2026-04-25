"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { useGarden } from "@/context/GardenContext"
import { useUser } from "@/context/UserContext"

type Garden = {
  id: number
  name: string
}

type Member = {
  garden_id: number
  user_id: number
  username: string
  role: string
  name: string
  email: string
  garden_name?: string
}

export default function MembersAdminPage() {
  const { gardenId } = useGarden()
  const { user, loadingUser } = useUser()
  const isSuper = user?.role === "super"

  const [members, setMembers] = useState<Member[]>([])
  const [gardens, setGardens] = useState<Garden[]>([])
  const [gardenFilter, setGardenFilter] = useState("")
  const [selectedGardenId, setSelectedGardenId] = useState("")

  const [loading, setLoading] = useState(false)

  const [openInvite, setOpenInvite] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("staff")

  const [openCreate, setOpenCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createUsername, setCreateUsername] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createRole, setCreateRole] = useState("staff")

  const [openEdit, setOpenEdit] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editRole, setEditRole] = useState("staff")

  const activeGardenId = isSuper
    ? Number(gardenFilter || selectedGardenId || 0)
    : Number(gardenId || 0)

  const myGardenRole = useMemo(() => {
    if (!user?.id && !user?.userId) return null

    const currentUserId = Number(user?.id || user?.userId)

    const mine = members.find(
      (m) =>
        Number(m.user_id) === currentUserId &&
        (!activeGardenId || Number(m.garden_id) === activeGardenId)
    )

    return mine?.role || null
  }, [members, user, activeGardenId])

  const canManageMembers =
    isSuper || myGardenRole === "owner" || myGardenRole === "admin"

  const loadGardens = async () => {
    try {
      const data = await api("/gardens")
      setGardens(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadMembers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (isSuper && gardenFilter) {
        params.set("garden_id", gardenFilter)
      }

      const data = await api(`/members${params.toString() ? `?${params.toString()}` : ""}`)
      setMembers(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error(err)
      setMembers([])
    }
    setLoading(false)
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
    loadMembers()
  }, [loadingUser, isSuper, gardenFilter, gardenId])

  const invite = async () => {
    try {
      if (!email) {
        alert("กรุณากรอก email")
        return
      }

      if (isSuper && !selectedGardenId) {
        alert("กรุณาเลือกสวน")
        return
      }

      const payload: any = { email, role }

      if (isSuper) {
        payload.garden_id = Number(selectedGardenId)
      }

      await api(`/members/invite`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setOpenInvite(false)
      setEmail("")
      setRole("staff")
      loadMembers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const createMember = async () => {
    try {
      if (!createName || !createEmail || !createPassword || !createUsername) {
        alert("กรุณากรอกข้อมูลให้ครบ")
        return
      }

      if (isSuper && !selectedGardenId) {
        alert("กรุณาเลือกสวน")
        return
      }

      const payload: any = {
        name: createName,
        username: createUsername,
        email: createEmail,
        password: createPassword,
        role: createRole,
      }

      if (isSuper) {
        payload.garden_id = Number(selectedGardenId)
      }

      await api(`/members/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setOpenCreate(false)
      setCreateName("")
      setCreateEmail("")
      setCreateUsername("")
      setCreatePassword("")
      setCreateRole("staff")
      loadMembers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const updateRole = async (userId: number, garden_id: number, newRole: string) => {
    try {
      const payload: any = { 
        garden_id: garden_id,
        role: newRole 
      }

      if (isSuper && gardenFilter) {
        payload.garden_id = Number(gardenFilter)
      }

      await api(`/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })

      loadMembers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openEditModal = (member: Member) => {
    setEditingMember(member)
    setEditName(member.name || "")
    setEditEmail(member.email || "")
    setEditUsername(member.username || "")
    setEditPassword("")
    setEditRole(member.role || "staff")
    setSelectedGardenId(String(member.garden_id || gardenId || ""))
    setOpenEdit(true)
  }

  const updateMemberProfile = async () => {
    try {
      if (!editingMember) return

      const payload: any = {
        name: editName,
        username: editUsername,
        email: editEmail,
        role: editRole,
      }

      if (editPassword) {
        payload.password = editPassword
      }

      if (isSuper) {
        payload.garden_id = Number(selectedGardenId)
      }

      await api(`/members/${editingMember.user_id}/profile`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })

      setOpenEdit(false)
      setEditingMember(null)
      setEditName("")
      setEditEmail("")
      setEditUsername("")
      setEditPassword("")
      setEditRole("staff")
      loadMembers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const removeMember = async (member: Member) => {
    const ok = confirm(`ลบ ${member.name} ออกจากสวน?`)
    if (!ok) return

    try {
      const query =
        isSuper && member.garden_id
          ? `?garden_id=${member.garden_id}`
          : ""

      await api(`/members/${member.user_id}${query}`, {
        method: "DELETE",
      })

      loadMembers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loadingUser) {
    return <div className="p-6">กำลังโหลดข้อมูลผู้ใช้...</div>
  }
      if (!canManageMembers) {
      alert("ไม่มีสิทธิ์เชิญสมาชิก")
      return
    }

        if (!canManageMembers) {
      alert("ไม่มีสิทธิ์เพิ่มสมาชิก")
      return
    }

        if (!canManageMembers) {
      alert("ไม่มีสิทธิ์แก้ไขสมาชิก")
      return
    }

        if (!canManageMembers) {
      alert("ไม่มีสิทธิ์ลบสมาชิก")
      return
    }

        if (!canManageMembers) {
      alert("ไม่มีสิทธิ์แก้ role")
      return
    }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">👥 สมาชิก</h2>

        <div className="flex items-center gap-3">
          {isSuper && (
            <select
              value={gardenFilter}
              onChange={(e) => setGardenFilter(e.target.value)}
              className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
            >
              <option value="">ทุกสวน</option>
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {canManageMembers && (
            <>
              <button
                onClick={() => {
                  setSelectedGardenId(isSuper ? "" : String(gardenId || ""))
                  setOpenCreate(true)
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                + เพิ่มสมาชิก
              </button>

              <button
                onClick={() => {
                  setSelectedGardenId(isSuper ? "" : String(gardenId || ""))
                  setOpenInvite(true)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                + เชิญสมาชิก
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y">
        {loading && (
          <div className="p-4 text-sm text-gray-500">กำลังโหลด...</div>
        )}

        {!loading && members.length === 0 && (
          <div className="p-4 text-sm text-gray-500">
            ยังไม่มีสมาชิก
          </div>
        )}

        {members.map((m) => (
          <div
            key={`${m.garden_id}-${m.user_id}`}
            className="flex justify-between items-center p-4 gap-4"
          >
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-gray-500">{m.email}</div>
              {isSuper && (
                <div className="text-xs text-gray-400 mt-1">
                  สวน: {m.garden_name || "-"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={(e) => updateRole(m.user_id, m.garden_id, e.target.value)}
                className="border px-3 py-2 rounded bg-white dark:bg-gray-800"
                disabled={m.role === "owner"}
              >
                <option value="admin">admin</option>
                <option value="staff">staff</option>
              </select>

              {canManageMembers && (
                <button
                  onClick={() => openEditModal(m)}
                  className="px-3 py-1 rounded bg-blue-500 text-white"
                >
                  แก้ไข
                </button>
              )}

              {canManageMembers && m.role !== "owner" && (
                <button
                  onClick={() => removeMember(m)}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  ลบ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {openInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-96 space-y-4">
            <h3 className="text-lg font-semibold">เชิญสมาชิก</h3>

            {isSuper && (
              <select
                value={selectedGardenId}
                onChange={(e) => setSelectedGardenId(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
              >
                <option value="">เลือกสวน</option>
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
            >
              <option value="admin">admin</option>
              <option value="staff">staff</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenInvite(false)}
                className="px-4 py-2 border rounded"
              >
                ยกเลิก
              </button>

              <button
                onClick={invite}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                เชิญ
              </button>
            </div>
          </div>
        </div>
      )}

      {openCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-96 space-y-4">
            <h3 className="text-lg font-semibold">เพิ่มสมาชิก</h3>

            {isSuper && (
              <select
                value={selectedGardenId}
                onChange={(e) => setSelectedGardenId(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
              >
                <option value="">เลือกสวน</option>
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="ชื่อ"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <input
              type="email"
              placeholder="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <input
              type="username"
              placeholder="username"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <input
              type="password"
              placeholder="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <select
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value)}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
            >
              <option value="admin">admin</option>
              <option value="staff">staff</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenCreate(false)}
                className="px-4 py-2 border rounded"
              >
                ยกเลิก
              </button>

              <button
                onClick={createMember}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {openEdit && editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-96 space-y-4">
            <h3 className="text-lg font-semibold">แก้ไขสมาชิก</h3>

            {isSuper && (
              <select
                value={selectedGardenId}
                onChange={(e) => setSelectedGardenId(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">เลือกสวน</option>
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="ชื่อ"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <input
              type="email"
              placeholder="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <input
              type="username"
              placeholder="username"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <input
              type="password"
              placeholder="password ใหม่ (ถ้าไม่เปลี่ยนปล่อยว่าง)"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />

            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              disabled={editingMember.role === "owner"}
            >
              <option value="admin">admin</option>
              <option value="staff">staff</option>
              {editingMember.role === "owner" && (
                <option value="owner">owner</option>
              )}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpenEdit(false)
                  setEditingMember(null)
                }}
                className="px-4 py-2 border rounded"
              >
                ยกเลิก
              </button>

              <button
                onClick={updateMemberProfile}
                className="px-4 py-2 bg-yellow-500 text-white rounded"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}