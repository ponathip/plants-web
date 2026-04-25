// components/SummaryCard.tsx
interface Props {
  title: string
  value: string
}

export function SummaryCard({ title, value }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}
