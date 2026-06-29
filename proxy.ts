import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getProtectedRouteRedirect } from '@/lib/auth-flow'
import { canAccessBetaApp, isBetaAccessEnabled } from '@/lib/beta'
import { isProfileOnboarded } from '@/lib/onboarding'

export async function proxy(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip Supabase session refresh if env vars aren't configured yet
  if (!supabaseUrl?.startsWith('http') || !supabaseKey?.startsWith('eyJ')) {
    return NextResponse.next({ request: req })
  }

  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname, search } = req.nextUrl

  let betaApproved = false
  let onboarded = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('beta_approved_at,public_display_name,username,profile_completed_at')
      .eq('id', user.id)
      .maybeSingle()

    const betaEnabled = isBetaAccessEnabled()
    betaApproved = canAccessBetaApp({ gateEnabled: betaEnabled, profile })
    onboarded = isProfileOnboarded(profile)
  }

  const redirectTo = getProtectedRouteRedirect({
    pathname,
    search,
    authenticated: Boolean(user),
    betaGateEnabled: isBetaAccessEnabled(),
    betaApproved,
    onboarded,
  })

  if (redirectTo) {
    const url = req.nextUrl.clone()
    const [path, query = ''] = redirectTo.split('?')
    url.pathname = path
    url.search = query ? `?${query}` : ''
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
