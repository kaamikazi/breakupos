import { redirect } from 'next/navigation'
import { ProfileOnboardingClient } from '@/components/Onboarding/ProfileOnboardingClient'
import { isProfileOnboarded } from '@/lib/onboarding'
import { ensureProfileForUser } from '@/lib/quota'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/onboarding')

  await ensureProfileForUser(user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,public_display_name,display_name,username,avatar_url,bio,profile_completed_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login?next=/onboarding')
  if (isProfileOnboarded(profile)) redirect('/social')

  return (
    <div className="min-h-[calc(100vh-56px)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto mb-6 max-w-md text-center">
        <div className="mb-3 inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-200">
          First run
        </div>
        <h1 className="text-3xl font-black text-white">Let&apos;s set up your profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Three quick steps, then Breakup OS will take you where you want to go first.
        </p>
      </div>
      <ProfileOnboardingClient profile={profile} />
    </div>
  )
}
