import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DatingOnboardingClient } from '@/components/Dating/DatingOnboardingClient'

export default async function DatingOnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('dating_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) redirect('/dating/profile')

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mx-auto mb-6 max-w-3xl text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Dating onboarding</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Build a safer, clearer dating profile</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Five quick steps to set expectations, add a photo, and open discovery without oversharing.
        </p>
      </div>
      <DatingOnboardingClient />
    </main>
  )
}
