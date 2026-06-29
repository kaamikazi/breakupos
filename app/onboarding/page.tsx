import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ProfileOnboardingClient } from '@/components/Onboarding/ProfileOnboardingClient'
import { SignOutButton } from '@/components/Auth/SignOutButton'
import { isOnboardingPath, sanitizeNextPath } from '@/lib/auth-flow'
import { logServerError } from '@/lib/logging'
import { isProfileOnboarded } from '@/lib/onboarding'
import { ensureProfileForUser } from '@/lib/quota'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface OnboardingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function OnboardingShell({ children }: { children: ReactNode }) {
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
      {children}
    </div>
  )
}

function ProfileLoadError() {
  return (
    <OnboardingShell>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
        <h2 className="text-xl font-black text-white">Could not load your profile.</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
          Your sign-in is still active, but Breakup OS could not read or repair your profile. This usually means the latest Supabase migration has not finished.
        </p>
        <div className="mt-5 grid gap-3">
          <Link href="/onboarding" className="inline-flex h-11 items-center justify-center rounded-lg bg-pink-500 px-4 text-sm font-semibold text-white transition hover:bg-pink-600">
            Retry
          </Link>
          <SignOutButton />
        </div>
      </div>
    </OnboardingShell>
  )
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams
  const next = sanitizeNextPath(typeof params?.next === 'string' ? params.next : '/social')
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/onboarding')

  try {
    await ensureProfileForUser(user)
  } catch (error) {
    logServerError('Onboarding profile repair failed', {
      route: '/onboarding',
      operation: 'ensure_profile',
      userId: user.id,
      errorMessage: error instanceof Error ? error.message : 'unknown',
    })
    return <ProfileLoadError />
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,public_display_name,display_name,username,avatar_url,bio,profile_completed_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile) {
    logServerError('Onboarding profile fetch failed', {
      route: '/onboarding',
      operation: 'fetch_profile',
      userId: user.id,
      code: error?.code,
      errorMessage: error?.message ?? 'profile_missing',
    })
    return <ProfileLoadError />
  }

  if (isProfileOnboarded(profile)) redirect(isOnboardingPath(next) ? '/social' : next)

  return (
    <OnboardingShell>
      <ProfileOnboardingClient profile={profile} />
    </OnboardingShell>
  )
}
