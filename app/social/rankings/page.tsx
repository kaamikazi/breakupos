import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { RankingsClient } from '@/components/Social/RankingsClient'

export default async function SocialRankingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Rankings</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Community Verdicts</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Top Loved, Most Red-Flagged, Most Divisive, and Trending Today — per section or across all of BreakupOS.
          </p>
        </div>
        <Link href="/social">
          <Button variant="outline" className="border-zinc-700 text-zinc-300">Back to feed</Button>
        </Link>
      </div>
      <RankingsClient />
    </main>
  )
}
