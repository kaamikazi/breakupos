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

    const errorUrl = new URL('/auth', appUrl)
    errorUrl.searchParams.set('error', 'callback_error')
    errorUrl.searchParams.set('message', error.message)
    return NextResponse.redirect(errorUrl)
  }

  const errorUrl = new URL('/auth', appUrl)
  errorUrl.searchParams.set('error', 'callback_error')
  errorUrl.searchParams.set(
    'message',
    searchParams.get('error_description') ??
      searchParams.get('error') ??
      'Google did not return a sign-in code. If you opened this from Instagram, copy the link and open it in Chrome or Safari.'
  )
  return NextResponse.redirect(errorUrl)
}
