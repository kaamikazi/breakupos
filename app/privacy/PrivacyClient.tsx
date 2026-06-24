'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase'
import { DELETE_ACCOUNT_CONFIRMATION, hasValidDeleteAccountConfirmation } from '@/lib/privacy'
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
  const [accountDeleting, setAccountDeleting] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

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

  const deleteAccount = async () => {
    if (!hasValidDeleteAccountConfirmation(deleteConfirmation) || accountDeleting) return
    setAccountDeleting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Could not delete account')

      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Account permanently deleted')
      window.location.replace('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete account')
    } finally {
      setAccountDeleting(false)
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

      <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Delete account</h2>
        <p className="text-sm text-red-100/80 mb-4">
          Permanently delete your Breakup OS account, profile, dating profile, photos, social posts, message requests, matches, chats, credits, notifications, situations, AI history, reports, weekly summaries, and Supabase sign-in user. This cannot be undone.
        </p>
        <Button onClick={() => setShowDeleteAccount(true)} className="bg-red-600 hover:bg-red-700 text-white">
          Delete account
        </Button>
      </div>

      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-zinc-950 p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-white">Delete account permanently?</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              This deletes your account and all user-owned Breakup OS data, including dating/chat/social data and uploaded profile or social photos where storage paths are available. Abuse reports involving your account are currently deleted with the account in this beta; future production policy may retain limited safety records.
            </p>
            <p className="mt-4 text-sm font-semibold text-red-100">
              Type DELETE to confirm.
            </p>
            <Input
              value={deleteConfirmation}
              onChange={event => setDeleteConfirmation(event.target.value)}
              placeholder={DELETE_ACCOUNT_CONFIRMATION}
              className="mt-2 bg-zinc-900 border-zinc-700 text-white"
            />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteAccount(false)
                  setDeleteConfirmation('')
                }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={deleteAccount}
                disabled={!hasValidDeleteAccountConfirmation(deleteConfirmation) || accountDeleting}
                className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {accountDeleting ? 'Deleting...' : 'Permanently delete account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
