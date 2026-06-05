'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AuthOptions() {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null)

  const signIn = async (provider: 'github' | 'google') => {
    setLoading(provider)
    window.location.assign(`/auth/login?provider=${provider}`)
  }

  return (
    <div className="space-y-3">
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
