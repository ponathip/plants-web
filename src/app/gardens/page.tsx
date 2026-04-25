import { getGardens } from '@/api/gardens'

export default async function GardensPage() {
  const gardens = await getGardens()

  return (
    <ul>
      {gardens.map(g => (
        <li key={g.id}>{g.name}</li>
      ))}
    </ul>
  )
}
