'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { createClient } from '@/lib/supabase'

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('instagram') || ua.includes('fbav') || ua.includes('fban') || ua.includes('tiktok') || ua.includes('line/')
}

export function AuthOptions() {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://breakupos-beta.vercel.app'
  const inAppBrowser = isInAppBrowser()
  const oauthDisabled = loading !== null || inAppBrowser

  const signIn = async (provider: 'github' | 'google') => {
    if (inAppBrowser) return
    setError(null)
    setLoading(provider)
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback/client', appUrl)
    callbackUrl.searchParams.set('next', '/dashboard')

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    })

    if (oauthError || !data.url) {
      setLoading(null)
      setError(oauthError?.message ?? 'Could not start sign-in. Please refresh and try again.')
      return
    }

    window.location.assign(data.url)
  }

  return (
    <div className="space-y-3">
      {inAppBrowser && (
        <InlineAlert tone="warning" title="Open in your browser first">
          Instagram/TikTok in-app browsers can block Google sign-in cookies. Tap the three dots and choose open in browser, or copy this beta link and paste it into Chrome or Safari.
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-xs font-semibold text-yellow-100 underline"
          >
            Open beta link
          </a>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(appUrl)
              setCopied(true)
            }}
            className="mt-2 block text-xs font-semibold text-yellow-100 underline"
          >
            {copied ? 'Link copied' : 'Copy beta link'}
          </button>
        </InlineAlert>
      )}
      {error && (
        <InlineAlert tone="warning" title="Sign-in did not start">
          {error}
        </InlineAlert>
      )}
      <Button
        onClick={() => signIn('github')}
        disabled={oauthDisabled}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-11"
      >
        {inAppBrowser ? 'Open in Chrome/Safari to use GitHub' : loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
      </Button>
      <Button
        onClick={() => signIn('google')}
        disabled={oauthDisabled}
        className="w-full bg-white hover:bg-zinc-100 text-zinc-900 h-11"
      >
        {inAppBrowser ? 'Open in Chrome/Safari to use Google' : loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
      </Button>
    </div>
  )
}
