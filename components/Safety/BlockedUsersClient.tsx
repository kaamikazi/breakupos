'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'

type BlockedUser = {
  id: string
  blocked_user_id: string
  blocked_at: string
  display_name: string
  username: string | null
  avatar_url: string | null
  profile_path: string | null
}

export function BlockedUsersClient() {
  const [blocks, setBlocks] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<BlockedUser | null>(null)
  const [unblocking, setUnblocking] = useState(false)

  const loadBlocks = async () => {
    setLoading(true)
    setError(null)
    const response = await fetch('/api/dating/blocks')
    setLoading(false)
    if (!response.ok) {
      setError('Blocked users could not load right now.')
      return
    }
    const payload = await response.json()
    setBlocks(payload.blocks ?? [])
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/dating/blocks')
      .then(async response => {
        if (!response.ok) throw new Error('Blocked users could not load right now.')
        return response.json()
      })
      .then(payload => {
        if (!cancelled) setBlocks(payload.blocks ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Blocked users could not load right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const unblock = async () => {
    if (!selected) return
    setUnblocking(true)
    const response = await fetch('/api/dating/block', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: selected.blocked_user_id }),
    })
    setUnblocking(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not unblock this user.')
      return
    }
    setBlocks(current => current.filter(block => block.blocked_user_id !== selected.blocked_user_id))
    setSelected(null)
    toast.success('User unblocked')
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Blocked users</h2>
          <p className="mt-1 text-sm text-zinc-400">Unblocking only removes your block. It does not send a request, create a match, or notify them.</p>
        </div>
        <Button type="button" onClick={loadBlocks} disabled={loading} variant="outline" className="border-zinc-700 text-zinc-200">
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">Loading blocked users...</div>
      ) : blocks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">You have not blocked anyone.</div>
      ) : (
        <div className="mt-4 grid gap-3">
          {blocks.map(block => {
            const avatar = (
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-500/15 font-bold text-pink-200">
                {block.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Provider avatars are direct public URLs.
                  <img src={block.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  block.display_name.slice(0, 1).toUpperCase()
                )}
              </span>
            )
            return (
              <article key={block.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {block.profile_path ? <Link href={block.profile_path}>{avatar}</Link> : avatar}
                  <div className="min-w-0">
                    {block.profile_path ? (
                      <Link href={block.profile_path} className="font-semibold text-white hover:text-pink-200">{block.display_name}</Link>
                    ) : (
                      <p className="font-semibold text-white">{block.display_name}</p>
                    )}
                    <p className="truncate text-xs text-zinc-500">
                      {block.username ? `@${block.username} - ` : ''}Blocked {formatDistanceToNow(new Date(block.blocked_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button type="button" onClick={() => setSelected(block)} variant="outline" className="border-zinc-700 text-zinc-200">
                  <Unlock className="mr-2 size-4" /> Unblock
                </Button>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmActionDialog
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) setSelected(null)
        }}
        title="Unblock this user?"
        body="They will be able to send requests or messages again if the rest of the app rules allow it. This will not automatically create a match or notify them."
        confirmLabel="Unblock user"
        confirming={unblocking}
        onConfirm={unblock}
      />
    </section>
  )
}
