import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { getAppUrl } from '@/lib/app-url'

const OAUTH_PROVIDERS = new Set(['google', 'github'])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appUrl = getAppUrl(req)
  const provider = searchParams.get('provider')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!provider || !OAUTH_PROVIDERS.has(provider)) {
    return NextResponse.redirect(`${appUrl}/auth?error=provider_error`)
  }

  const cookiesToSet: ResponseCookie[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(items) {
          items.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, ...options })
          })
        },
      },
    }
  )

  const callbackUrl = new URL('/auth/callback', appUrl)
  callbackUrl.searchParams.set('next', next.startsWith('/') ? next : '/dashboard')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as 'google' | 'github',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })

  if (error || !data.url) {
    const errorUrl = new URL('/auth', appUrl)
    errorUrl.searchParams.set('error', 'oauth_start_error')
    errorUrl.searchParams.set('message', error?.message ?? 'Could not start OAuth sign-in.')
    return NextResponse.redirect(errorUrl)
  }

  const response = NextResponse.redirect(data.url)
  cookiesToSet.forEach(cookie => response.cookies.set(cookie))
  return response
}
