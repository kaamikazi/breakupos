import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthOptions } from '@/components/Auth/AuthOptions'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { LOGIN_PATH, getPostLoginRedirect, pathNeedsDatingProfile, sanitizeNextPath } from '@/lib/auth-flow'
import { canAccessBetaApp, isBetaAccessEnabled } from '@/lib/beta'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface AuthEntryPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function AuthEntryPage({ searchParams }: AuthEntryPageProps) {
  const params = await searchParams
  const code = typeof params?.code === 'string' ? params.code : null
  const error = typeof params?.error === 'string' ? params.error : null
  const errorCode = typeof params?.error_code === 'string' ? params.error_code : null
  const errorDescription = typeof params?.error_description === 'string' ? params.error_description : null
  const message = typeof params?.message === 'string' ? params.message : null
  const next = sanitizeNextPath(typeof params?.next === 'string' ? params.next : '/dashboard')
  const betaEnabled = isBetaAccessEnabled()

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('beta_approved_at')
      .eq('id', user.id)
      .maybeSingle()

    const { data: datingProfile } = pathNeedsDatingProfile(next)
      ? await supabase
        .from('dating_profiles')
        .select('user_id,onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()
      : { data: null }

    redirect(getPostLoginRedirect({
      requestedNext: next,
      betaGateEnabled: betaEnabled,
      betaApproved: canAccessBetaApp({ gateEnabled: betaEnabled, profile }),
      needsProfileSetup: pathNeedsDatingProfile(next) && !datingProfile?.onboarding_completed,
    }))
  }

  const fallbackMessage = error === 'callback_error'
    ? 'Google did not return a usable sign-in session. Open the beta link directly in Chrome or Safari and try again.'
    : 'The OAuth callback could not create a session.'
  const errorMessage = errorDescription ?? message ?? fallbackMessage

  return (
    <div className="min-h-[calc(100vh-56px)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 sm:pt-14">
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md flex-col justify-center">
        <div className="mb-7 text-center">
          <Link href="/" className="mb-5 inline-flex items-center text-2xl font-black tracking-tight text-white">
            Breakup<span className="text-pink-500">OS</span>
          </Link>
          <div className="mx-auto mb-4 w-fit rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-200">
            {betaEnabled ? 'Private beta' : 'Mobile beta live'}
          </div>
          <h1 className="text-4xl font-black leading-tight text-white">Welcome to Breakup OS</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-300">
            Decode breakups, ghosting, talking stages, red flags, and no-contact with AI-powered relationship tools.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-2xl shadow-black/20 sm:p-5">
          <AuthOptions nextPath={next} />

          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-100">
            Your private trackers, AI analysis, and relationship data stay private.
          </div>
          <div className="mt-3 rounded-xl border border-pink-500/20 bg-pink-500/10 p-3 text-xs leading-relaxed text-pink-100">
            Mobile beta is live. Some features are still experimental.
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <InlineAlert tone="warning" title="Sign-in did not finish">
              <div className="space-y-3">
                <p>{errorMessage}</p>
                {(error || errorCode) && (
                  <p className="text-xs text-amber-100/70">
                    Error: {[error, errorCode].filter(Boolean).join(' / ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Link href={`${LOGIN_PATH}?next=${encodeURIComponent(next)}`} className="inline-flex text-xs font-semibold text-amber-100 underline">
                    Clear this error
                  </Link>
                  <Link href={`/auth/login?provider=google&next=${encodeURIComponent(next)}`} className="inline-flex text-xs font-semibold text-amber-100 underline">
                    Try Google again
                  </Link>
                </div>
              </div>
            </InlineAlert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/safety" className="hover:text-white">Safety</Link>
          <span>Not therapy, legal advice, or crisis support.</span>
        </div>
      </div>
    </div>
  )
}
