import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isBetaAccessEnabled } from '@/lib/beta'
import { AuthOptions } from '@/components/Auth/AuthOptions'
import { InlineAlert } from '@/components/shared/InlineAlert'

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams
  const code = typeof params?.code === 'string' ? params.code : null
  const error = typeof params?.error === 'string' ? params.error : null
  const errorCode = typeof params?.error_code === 'string' ? params.error_code : null
  const errorDescription = typeof params?.error_description === 'string' ? params.error_description : null
  const message = typeof params?.message === 'string' ? params.message : null
  const fallbackMessage = error === 'callback_error'
    ? 'Google did not return a usable sign-in session. Open the beta link directly in Chrome or Safari and try again.'
    : 'The OAuth callback could not create a session.'
  const errorMessage = errorDescription ?? message ?? fallbackMessage
  if (code) {
    const next = typeof params?.next === 'string' ? params.next : '/dashboard'
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const betaEnabled = isBetaAccessEnabled()

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs text-pink-200 mb-4">
            Private beta
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sign in
          </h1>
          <p className="text-zinc-400 text-sm">
            {betaEnabled
              ? 'Sign in first, then enter the beta password once to unlock your account.'
              : 'Use the same account each time so your private relationship data stays with you.'}
          </p>
        </div>

        <AuthOptions />

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
                  <a href="/auth" className="inline-flex text-xs font-semibold text-amber-100 underline">
                    Clear this error
                  </a>
                  <a href="/auth/login?provider=google" className="inline-flex text-xs font-semibold text-amber-100 underline">
                    Try Google fallback
                  </a>
                </div>
              </div>
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
