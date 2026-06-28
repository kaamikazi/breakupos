import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAppUrl } from '@/lib/app-url'
import { getPostLoginRedirect, pathNeedsDatingProfile, sanitizeNextPath } from '@/lib/auth-flow'
import { isBetaAccessEnabled, isBetaApproved } from '@/lib/beta'
import { isProfileOnboarded } from '@/lib/onboarding'
import { ensureProfileForUser } from '@/lib/quota'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appUrl = getAppUrl(req)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const response = NextResponse.redirect(`${appUrl}${next}`)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const profile = await ensureProfileForUser(user)
        const { data: datingProfile } = pathNeedsDatingProfile(next)
          ? await supabase
            .from('dating_profiles')
            .select('user_id,onboarding_completed')
            .eq('user_id', user.id)
            .maybeSingle()
          : { data: null }
        const redirectTo = getPostLoginRedirect({
          requestedNext: next,
          betaGateEnabled: isBetaAccessEnabled(),
          betaApproved: isBetaApproved(profile),
          needsOnboarding: !isProfileOnboarded(profile),
          needsProfileSetup: pathNeedsDatingProfile(next) && !datingProfile?.onboarding_completed,
        })
        response.headers.set('location', `${appUrl}${redirectTo}`)
      }
      return response
    }

    const errorUrl = new URL('/login', appUrl)
    errorUrl.searchParams.set('error', 'callback_error')
    errorUrl.searchParams.set('message', error.message)
    errorUrl.searchParams.set('next', next)
    return NextResponse.redirect(errorUrl)
  }

  const errorUrl = new URL('/login', appUrl)
  errorUrl.searchParams.set('error', 'callback_error')
  errorUrl.searchParams.set('next', next)
  errorUrl.searchParams.set(
    'message',
    searchParams.get('error_description') ??
      searchParams.get('error') ??
      'Google did not return a sign-in code. If you opened this from Instagram, copy the link and open it in Chrome or Safari.'
  )
  return NextResponse.redirect(errorUrl)
}
