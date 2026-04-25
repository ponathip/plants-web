import toast from "react-hot-toast"

export const toastSuccess = (message: string) =>
  toast.custom((t) => (
    <div
      className={`
        flex items-center gap-3
        px-4 py-3 rounded-lg shadow-lg
        bg-green-900/80 border border-green-600
        text-green-100
        transition
        ${t.visible ? "animate-enter" : "animate-leave"}
      `}
    >
      <span className="text-xl">✅</span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  ))

export const toastError = (message: string) =>
  toast.custom((t) => (
    <div
      className={`
        flex items-center gap-3
        px-4 py-3 rounded-lg shadow-lg
        bg-red-900/80 border border-red-600
        text-red-100
        transition
        ${t.visible ? "animate-enter" : "animate-leave"}
      `}
    >
      <span className="text-xl">❌</span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  ))