import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAppUrl } from '@/lib/app-url'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appUrl = getAppUrl(req)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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
      return response
    }

    const fallbackUrl = new URL('/auth/callback/client', appUrl)
    fallbackUrl.searchParams.set('code', code)
    fallbackUrl.searchParams.set('next', next)
    fallbackUrl.searchParams.set('server_error', error.message)
    return NextResponse.redirect(fallbackUrl)
  }

  return NextResponse.redirect(`${appUrl}/auth?error=callback_error`)
}
