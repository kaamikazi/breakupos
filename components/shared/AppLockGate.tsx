'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AppLockGate() {
  const [locked, setLocked] = useState(() =>
    typeof window !== 'undefined' &&
    Boolean(localStorage.getItem('breakupos-pin')) &&
    sessionStorage.getItem('breakupos-unlocked') !== 'true'
  )
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const unlock = () => {
    if (btoa(pin) === localStorage.getItem('breakupos-pin')) {
      sessionStorage.setItem('breakupos-unlocked', 'true')
      setLocked(false)
      setError('')
      return
    }
    setError('Wrong PIN')
  }

  if (!locked) return null

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">BreakupOS Locked</h2>
        <p className="text-sm text-zinc-400 mb-4">Enter your local PIN to continue.</p>
        <Input
          value={pin}
          onChange={e => setPin(e.target.value)}
          type="password"
          className="bg-zinc-800 border-zinc-700 text-white mb-3"
          onKeyDown={e => {
            if (e.key === 'Enter') unlock()
          }}
        />
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <Button onClick={unlock} className="w-full bg-pink-500 hover:bg-pink-600 text-white">
          Unlock
        </Button>
      </div>
    </div>
  )
}
