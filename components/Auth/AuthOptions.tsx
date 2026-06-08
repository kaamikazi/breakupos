'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('instagram') || ua.includes('fbav') || ua.includes('fban') || ua.includes('tiktok') || ua.includes('line/')
}

export function AuthOptions() {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null)
  const [copied, setCopied] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://breakupos-beta.vercel.app'
  const inAppBrowser = isInAppBrowser()

  const signIn = async (provider: 'github' | 'google') => {
    setLoading(provider)
    window.location.assign(`/auth/login?provider=${provider}`)
  }

  return (
    <div className="space-y-3">
      {inAppBrowser && (
        <InlineAlert tone="warning" title="Open in your browser first">
          Instagram/TikTok in-app browsers can block Google sign-in cookies. Open this page in Chrome or Safari, then sign in.
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
      <Button
        onClick={() => signIn('github')}
        disabled={loading !== null}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-11"
      >
        {loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
      </Button>
      <Button
        onClick={() => signIn('google')}
        disabled={loading !== null}
        className="w-full bg-white hover:bg-zinc-100 text-zinc-900 h-11"
      >
        {loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
      </Button>
    </div>
  )
}
