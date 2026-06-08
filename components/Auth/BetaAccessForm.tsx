'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { toast } from 'sonner'

export function BetaAccessForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/beta/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data.error ?? 'Invalid beta code'
        setError(message)
        toast.error(message)
        return
      }
      setSuccess(true)
      toast.success('Beta access unlocked')
      // Cookie is already set server-side (httpOnly) from the API response
      window.location.replace('/auth')
    } catch {
      setError('Could not verify beta access. Check your connection and try again.')
      toast.error('Could not verify beta access')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="space-y-4">
      <InlineAlert tone="info">
        BreakupOS is in private beta. Enter your invite code to unlock sign-in. Existing signed-in beta users can continue normally.
      </InlineAlert>
      <Input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Beta access code"
        className="bg-zinc-900 border-zinc-700 text-white"
      />
      {error && (
        <InlineAlert tone="warning" title="Code did not work">
          {error}
        </InlineAlert>
      )}
      {success && (
        <InlineAlert tone="success" title="Beta unlocked">
          Sending you to sign in now.
        </InlineAlert>
      )}
      <Button
        type="button"
        onClick={submit}
        disabled={loading || !code.trim()}
        className="w-full bg-pink-500 hover:bg-pink-600 text-white"
      >
        {loading ? 'Checking...' : 'Unlock beta access'}
      </Button>
    </div>
  )
}
