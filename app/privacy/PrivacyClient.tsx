'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function PrivacyClient() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [savedPin, setSavedPin] = useState(() =>
    typeof window !== 'undefined' && Boolean(localStorage.getItem('breakupos-pin'))
  )
  const [anonymous, setAnonymous] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('breakupos-panic-hide') === 'true'
  )
  const [deleting, setDeleting] = useState(false)

  const savePin = () => {
    if (pin.length < 4) {
      toast.error('Use at least 4 digits or characters.')
      return
    }
    localStorage.setItem('breakupos-pin', btoa(pin))
    setSavedPin(true)
    setPin('')
    toast.success('Local app lock PIN saved')
  }

  const clearPin = () => {
    localStorage.removeItem('breakupos-pin')
    setSavedPin(false)
    toast.success('Local app lock cleared')
  }

  const toggleAnonymous = () => {
    const next = !anonymous
    setAnonymous(next)
    localStorage.setItem('breakupos-panic-hide', String(next))
    document.documentElement.classList.toggle('panic-hide', next)
  }

  const exportData = async () => {
    const res = await fetch('/api/export')
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `breakupos-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const deleteAll = async () => {
    if (!confirm('Delete all situations, interactions, and AI advice? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/privacy/delete-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY BREAKUPOS DATA' }),
      })
      if (!res.ok) throw new Error()
      toast.success('All relationship data deleted')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Could not delete data')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Local App Lock</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Saves a lightweight PIN in this browser only. TODO: replace with server-backed encryption before treating this as strong security.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder={savedPin ? 'PIN saved locally' : 'Create a local PIN'}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <Button onClick={savePin} className="bg-pink-500 hover:bg-pink-600 text-white">Save PIN</Button>
          {savedPin && (
            <Button onClick={clearPin} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Panic Hide</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Hide names on shared screens and switch visible labels to anonymous placeholders.
        </p>
        <Button onClick={toggleAnonymous} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          {anonymous ? 'Show Names' : 'Hide Names'}
        </Button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Export Data</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Download your profile, situations, interactions, and AI advice as JSON.
        </p>
        <Button onClick={exportData} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Export All Data
        </Button>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Delete Relationship Data</h2>
        <p className="text-sm text-red-100/80 mb-4">
          Removes situations, interactions, and advice while keeping your account/profile.
        </p>
        <Button onClick={deleteAll} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
          {deleting ? 'Deleting...' : 'Delete All Data'}
        </Button>
      </div>
    </div>
  )
}
