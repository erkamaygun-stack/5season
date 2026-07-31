import { redirect } from 'next/navigation'

export default async function AidatPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year } = await searchParams
  redirect(year ? `/finans?tab=aidat&year=${year}` : '/finans?tab=aidat')
}
