'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { getOAuthLoginPath, sanitizeNextPath } from '@/lib/auth-flow'

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('instagram') || ua.includes('fbav') || ua.includes('fban') || ua.includes('tiktok') || ua.includes('line/')
}

interface AuthOptionsProps {
  nextPath?: string | null
}

export function AuthOptions({ nextPath }: AuthOptionsProps) {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null)
  const [copied, setCopied] = useState(false)
  const safeNext = sanitizeNextPath(nextPath)
  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://breakupos-beta.vercel.app'
  const inAppBrowser = isInAppBrowser()
  const oauthDisabled = loading !== null || inAppBrowser

  const signIn = (provider: 'github' | 'google') => {
    if (inAppBrowser) return
    setLoading(provider)
    window.location.assign(getOAuthLoginPath(provider, safeNext))
  }

  return (
    <div className="space-y-4">
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
      <Button
        onClick={() => signIn('google')}
        disabled={oauthDisabled}
        className="h-12 w-full bg-white text-base font-semibold text-zinc-950 hover:bg-zinc-100"
      >
        {inAppBrowser ? 'Open in Chrome/Safari to use Google' : loading === 'google' ? 'Opening Google...' : 'Continue with Google'}
      </Button>
      <Button
        onClick={() => signIn('github')}
        disabled={oauthDisabled}
        variant="outline"
        className="h-11 w-full border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
      >
        {inAppBrowser ? 'Open in Chrome/Safari to use GitHub' : loading === 'github' ? 'Opening GitHub...' : 'Continue with GitHub'}
      </Button>
    </div>
  )
}
