import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { BETA_ACCESS_COOKIE, isBetaAccessEnabled } from '@/lib/beta'
import { AuthOptions } from '@/components/Auth/AuthOptions'
import { BetaAccessForm } from '@/components/Auth/BetaAccessForm'
import { InlineAlert } from '@/components/shared/InlineAlert'

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams
  const code = typeof params?.code === 'string' ? params.code : null
  const error = typeof params?.error === 'string' ? params.error : null
  const message = typeof params?.message === 'string' ? params.message : null
  const fallbackMessage = error === 'callback_error'
    ? 'Google did not return a usable sign-in session. Open the beta link directly in Chrome or Safari, not Instagram or another in-app browser. Also confirm Supabase allows https://breakupos-beta.vercel.app/auth/callback and /auth/callback/client.'
    : 'The OAuth callback could not create a session. Check the Supabase redirect URL and provider settings.'
  if (code) {
    const next = typeof params?.next === 'string' ? params.next : '/dashboard'
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const cookieStore = await cookies()
  const betaEnabled = isBetaAccessEnabled()
  const hasBetaAccess = cookieStore.get(BETA_ACCESS_COOKIE)?.value === 'granted'
  const shouldAskForCode = betaEnabled && !hasBetaAccess

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs text-pink-200 mb-4">
            Private beta
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {shouldAskForCode ? 'Enter your beta code' : 'Sign in'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {shouldAskForCode
              ? 'We are keeping the beta small while the product hardens.'
              : 'Use the same account each time so your private relationship data stays with you.'}
          </p>
        </div>

        {shouldAskForCode ? <BetaAccessForm /> : <AuthOptions />}

        {error && (
          <div className="mt-4">
            <InlineAlert tone="warning" title="Sign-in did not finish">
              {message ?? fallbackMessage}
            </InlineAlert>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 mt-6">
          BreakupOS is not therapy, legal advice, or crisis support.
        </p>
      </div>
    </div>
  )
}
