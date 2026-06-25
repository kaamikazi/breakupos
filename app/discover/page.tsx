import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { DiscoveryFeed } from '@/components/Dating/DiscoveryFeed'

export default async function DiscoverPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: datingProfile } = await supabase
    .from('dating_profiles')
    .select('user_id,onboarding_completed,visibility_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!datingProfile?.onboarding_completed) {
    redirect('/dating/onboarding')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Discover</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Meet one profile at a time</h1>
          <p className="mt-2 text-sm text-zinc-400">Like, pass, block, or report. Already handled profiles stay out of your feed.</p>
        </div>
        <Link href="/dating/profile">
          <Button variant="outline" className="border-zinc-700 text-zinc-300">Edit profile</Button>
        </Link>
      </div>
      {datingProfile.visibility_status === 'hidden' && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Your profile is hidden. You can browse discovery, but other users will not see you until visibility is turned on.
        </div>
      )}
      <DiscoveryFeed />
    </main>
  )
}
