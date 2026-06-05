'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { InlineAlert } from '@/components/shared/InlineAlert'

function getSafeCallbackShape() {
  if (typeof window === 'undefined') return 'server'
  const url = new URL(window.location.href)
  const queryKeys = Array.from(url.searchParams.keys()).sort()
  const hashKeys = Array.from(new URLSearchParams(url.hash.replace(/^#/, '')).keys()).sort()
  return `path=${url.pathname}; query=${queryKeys.join(',') || 'none'}; hash=${hashKeys.join(',') || 'none'}`
}

function getOAuthCallbackError() {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const error =
    url.searchParams.get('error_description') ??
    hashParams.get('error_description') ??
    url.searchParams.get('error') ??
    hashParams.get('error')
  const code = url.searchParams.get('error_code') ?? hashParams.get('error_code')

  if (!error) return null
  return code ? `${error} (${code})` : error
}

export function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const finishSignIn = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'
      const supabase = createClient()
      const callbackError = getOAuthCallbackError()

      if (callbackError) {
        setError(callbackError)
        return
      }

      const redirectToApp = () => {
        router.replace(next.startsWith('/') ? next : '/dashboard')
        router.refresh()
      }

      if (!code) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: hashError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (cancelled) return

          if (!hashError) {
            redirectToApp()
            return
          }

          setError(hashError.message)
          return
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (cancelled) return

        if (data.session && !sessionError) {
          redirectToApp()
          return
        }

        const session = await new Promise<boolean>(resolve => {
          let unsubscribe = () => {}
          const timeout = window.setTimeout(() => {
            unsubscribe()
            resolve(false)
          }, 2500)

          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, authSession) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && authSession) {
              window.clearTimeout(timeout)
              unsubscribe()
              resolve(true)
            }
          })
          unsubscribe = () => subscription.unsubscribe()
        })

        if (cancelled) return
        if (session) {
          redirectToApp()
          return
        }

        setError(sessionError?.message ?? `No OAuth code, token hash, or browser session was found. Callback shape: ${getSafeCallbackShape()}`)
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (cancelled) return

      if (exchangeError) {
        setError(exchangeError.message)
        return
      }

      redirectToApp()
    }

    finishSignIn()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs text-pink-200 mb-4">
          Signing in
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">Finishing sign-in</h1>
        <p className="mb-6 text-sm text-zinc-400">
          We are creating your local session and sending you into BreakupOS.
        </p>
        {error && (
          <InlineAlert tone="warning" title="Sign-in did not finish">
            {error}
          </InlineAlert>
        )}
      </div>
    </div>
  )
}
