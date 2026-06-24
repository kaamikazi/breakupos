'use client'

import { useRef, useState } from 'react'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { toast } from 'sonner'

interface BetaAccessFormProps {
  signedIn?: boolean
}

export function BetaAccessForm({ signedIn = false }: BetaAccessFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    const trimmed = inputRef.current?.value.trim() ?? ''
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/beta/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data.error ?? 'Invalid beta password'
        setError(message)
        toast.error(message)
        return
      }
      setSuccess(true)
      toast.success('Beta access unlocked')
      window.location.replace(data.redirectTo ?? (signedIn ? '/dashboard' : '/auth'))
    } catch {
      const msg = 'Could not verify beta access. Check your connection and try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <InlineAlert tone="info">
        BreakupOS is in private beta. Enter the beta password to unlock this account. If you do not have one yet, request access from the beta owner.
      </InlineAlert>

      <input
        ref={inputRef}
        defaultValue=""
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Beta password"
        type="text"
        disabled={loading}
        className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
      />

      {error && (
        <InlineAlert tone="warning" title="Password did not work">
          {error}
        </InlineAlert>
      )}
      {success && (
        <InlineAlert tone="success" title="Beta unlocked">
          Sending you in now.
        </InlineAlert>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="h-11 w-full rounded-lg bg-pink-500 px-4 text-sm font-medium text-white transition-colors hover:bg-pink-600 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Unlock beta access'}
      </button>
    </div>
  )
}
