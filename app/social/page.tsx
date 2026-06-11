import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { SocialFeed } from '@/components/Social/SocialFeed'

export default async function SocialPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Social</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Love vs Red Flag</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Photo-only posts. The community votes on the situation, and the verdict speaks for itself.
          </p>
        </div>
        <Link href="/social/rankings">
          <Button variant="outline" className="border-zinc-700 text-zinc-300">View rankings</Button>
        </Link>
      </div>
      <SocialFeed />
    </main>
  )
}
