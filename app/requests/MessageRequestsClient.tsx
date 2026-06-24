'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'

type RequestRow = {
  id: string
  sender_id: string
  sender_name: string
  sender_username: string | null
  sender_avatar_url: string | null
  sender_profile_path: string | null
  message_text: string
  status: string
  created_at: string
  source_post: { id: string; image_url: string; section: string } | null
}

export function MessageRequestsClient({ initialRequests }: { initialRequests: RequestRow[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<RequestRow | null>(null)

  const act = async (id: string, action: 'accept' | 'decline' | 'block') => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/message-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not update request.')
        return
      }
      setRequests(current => current.map(req => req.id === id ? { ...req, status: payload.status } : req))
      toast.success(action === 'accept' ? 'Request accepted' : action === 'block' ? 'User blocked' : 'Request declined')
      if (action === 'accept' && payload.match_id) window.location.assign(`/matches/${payload.match_id}`)
    } finally {
      setLoadingId(null)
    }
  }

  const report = async (request: RequestRow) => {
    setLoadingId(request.id)
    try {
      const response = await fetch('/api/dating/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: request.sender_id,
          reason: 'other',
          details: 'Reported from message request inbox.',
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not report this request.')
        return
      }
      toast.success('Report sent')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 && (
        <EmptyState title="No message requests yet" description="When someone reaches out from social, requests appear here first." />
      )}
      {requests.map(request => (
        <article key={request.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex gap-3">
            {request.sender_profile_path ? (
            <Link href={request.sender_profile_path} className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-500/15 font-bold text-pink-200">
              {request.sender_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Provider avatars are direct public URLs.
                <img src={request.sender_avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                request.sender_name.slice(0, 1).toUpperCase()
              )}
            </Link>
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-500/15 font-bold text-pink-200">
                {request.sender_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Provider avatars are direct public URLs.
                  <img src={request.sender_avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  request.sender_name.slice(0, 1).toUpperCase()
                )}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {request.sender_profile_path ? (
                <Link href={request.sender_profile_path} className="font-semibold text-white hover:text-pink-200">
                  {request.sender_name}
                </Link>
              ) : (
                <span className="font-semibold text-white">{request.sender_name}</span>
              )}
              <p className="text-xs text-zinc-500">@{request.sender_username ?? 'beta-user'} sent a request</p>
              {request.message_text && <p className="mt-3 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">{request.message_text}</p>}
            </div>
            {request.source_post && (
              // eslint-disable-next-line @next/next/no-img-element -- User-uploaded Supabase Storage images are served directly during beta.
              <img src={request.source_post.image_url} alt="" className="size-16 rounded-xl border border-zinc-800 object-cover" />
            )}
          </div>

          {request.status === 'pending' ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button disabled={loadingId === request.id} onClick={() => act(request.id, 'accept')} className="bg-pink-500 text-white hover:bg-pink-600">
                Accept
              </Button>
              <Button disabled={loadingId === request.id} onClick={() => act(request.id, 'decline')} variant="outline" className="border-zinc-700 text-zinc-300">
                Decline
              </Button>
              <Button disabled={loadingId === request.id} onClick={() => setBlockTarget(request)} variant="outline" className="border-red-500/40 text-red-200">
                Block
              </Button>
              <Button disabled={loadingId === request.id} onClick={() => report(request)} variant="outline" className="border-zinc-700 text-zinc-300">
                Report
              </Button>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-zinc-800 px-3 py-2 text-xs uppercase tracking-wide text-zinc-500">
              {request.status}
            </p>
          )}
        </article>
      ))}
      <ConfirmActionDialog
        open={Boolean(blockTarget)}
        onOpenChange={open => {
          if (!open) setBlockTarget(null)
        }}
        title="Block this user?"
        body="You won't receive messages or requests from this person. You can unblock them later from Safety settings."
        confirmLabel="Block user"
        confirming={Boolean(blockTarget && loadingId === blockTarget.id)}
        destructive
        onConfirm={async () => {
          if (!blockTarget) return
          await act(blockTarget.id, 'block')
          setBlockTarget(null)
        }}
      />
    </div>
  )
}
