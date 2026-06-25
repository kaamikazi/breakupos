import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { buildLoginRedirect, isPublicAppPath } from '@/lib/auth-flow'
import { canAccessBetaApp, isBetaAccessEnabled } from '@/lib/beta'

const BETA_PUBLIC_PREFIXES = [
  '/',
  '/login',
  '/auth',
  '/api/beta',
  '/api/og',
  '/manifest.webmanifest',
  '/safety',
  '/privacy',
]

function isBetaGatePath(pathname: string) {
  if (pathname === '/beta-access') return false
  return !BETA_PUBLIC_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

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

  if (!user && !isPublicAppPath(pathname)) {
    const url = req.nextUrl.clone()
    const redirectTo = buildLoginRedirect(pathname, search)
    url.pathname = redirectTo.split('?')[0]
    url.search = redirectTo.includes('?') ? `?${redirectTo.split('?')[1]}` : ''
    return NextResponse.redirect(url)
  }

  if (user && isBetaAccessEnabled()) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('beta_approved_at')
      .eq('id', user.id)
      .maybeSingle()

    const approved = canAccessBetaApp({ gateEnabled: true, profile })
    if (!approved && isBetaGatePath(pathname)) {
      const url = req.nextUrl.clone()
      url.pathname = '/beta-access'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (approved && pathname === '/beta-access') {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
