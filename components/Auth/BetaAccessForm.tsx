'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { toast } from 'sonner'

export function BetaAccessForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/beta/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Invalid beta code')
        return
      }
      toast.success('Beta access unlocked')
      document.cookie = 'breakupos_beta_access=granted; path=/; max-age=7776000; SameSite=Lax'
      window.location.assign('/auth')
    } catch {
      toast.error('Could not verify beta access')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <InlineAlert tone="info">
        BreakupOS is in private beta. Enter your invite code to unlock sign-in. Existing signed-in beta users can continue normally.
      </InlineAlert>
      <Input
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Beta access code"
        className="bg-zinc-900 border-zinc-700 text-white"
      />
      <Button disabled={loading || !code.trim()} className="w-full bg-pink-500 hover:bg-pink-600 text-white">
        {loading ? 'Checking...' : 'Unlock beta access'}
      </Button>
    </form>
  )
}
