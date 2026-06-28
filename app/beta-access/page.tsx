import { redirect } from 'next/navigation'
import { BetaAccessForm } from '@/components/Auth/BetaAccessForm'
import { SignOutButton } from '@/components/Auth/SignOutButton'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { canAccessBetaApp, hasBetaPasswordConfigured, isBetaAccessEnabled } from '@/lib/beta'
import { isProfileOnboarded } from '@/lib/onboarding'
import { ensureProfileForUser } from '@/lib/quota'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function BetaAccessPage() {
  const betaEnabled = isBetaAccessEnabled()
  if (!betaEnabled) redirect('/dashboard')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await ensureProfileForUser(user)
  if (canAccessBetaApp({ gateEnabled: betaEnabled, profile })) {
    redirect(isProfileOnboarded(profile) ? '/dashboard' : '/onboarding')
  }

  const passwordConfigured = hasBetaPasswordConfigured()

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs text-pink-200 mb-4">
            Private beta
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Breakup OS is in private beta</h1>
          <p className="text-zinc-400 text-sm">
            Enter the beta password or request access. Once approved, this account will skip this step next time.
          </p>
        </div>

        {!passwordConfigured ? (
          <InlineAlert tone="warning" title="Beta password missing">
            Beta access is enabled, but the server is missing BETA_ACCESS_CODE. Ask the admin to configure it in Vercel.
          </InlineAlert>
        ) : (
          <BetaAccessForm signedIn />
        )}

        <div className="mt-5 text-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
