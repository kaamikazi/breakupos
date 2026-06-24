'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MessageCircle, ShieldAlert, UserX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'

const PRESETS = [
  'Loved your post.',
  'Same situation here.',
  'Your post was relatable.',
  'Can I ask about this?',
]

export function MessageRequestButton({
  receiverId,
  sourcePostId,
  label = 'Send request',
  compact = false,
}: {
  receiverId: string
  sourcePostId?: string | null
  label?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/message-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: receiverId,
          source_post_id: sourcePostId ?? null,
          message_text: message || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not send request.')
        return
      }
      toast.success('Message request sent')
      setOpen(false)
      setMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? 'h-9 bg-zinc-100 px-3 text-zinc-950 hover:bg-white' : 'bg-pink-500 text-white hover:bg-pink-600'}
      >
        <MessageCircle className="mr-2 size-4" />
        {label}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-zinc-950/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Send a message request</h2>
                <p className="text-xs text-zinc-500">They can accept before chat opens.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <InlineAlert tone="info">
              Keep it respectful. Message requests are rate-limited, and blocked users cannot send again.
            </InlineAlert>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMessage(preset)}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-pink-500/50 hover:text-pink-200"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={event => setMessage(event.target.value.slice(0, 240))}
              placeholder="Optional short note"
              className="mt-4 min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-pink-500"
            />
            <p className="mt-1 text-right text-xs text-zinc-600">{message.length}/240</p>

            <Button
              type="button"
              disabled={loading}
              onClick={submit}
              className="mt-4 h-11 w-full bg-pink-500 text-white hover:bg-pink-600"
            >
              {loading ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export function PublicProfileSafetyActions({ targetUserId }: { targetUserId: string }) {
  const [loading, setLoading] = useState<'block' | 'report' | null>(null)

  const block = async () => {
    setLoading('block')
    try {
      const response = await fetch('/api/dating/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not block this user.')
        return
      }
      toast.success('User blocked')
    } finally {
      setLoading(null)
    }
  }

  const report = async () => {
    setLoading('report')
    try {
      const response = await fetch('/api/dating/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: targetUserId,
          reason: 'other',
          details: 'Reported from public social profile.',
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not report this user.')
        return
      }
      toast.success('Report sent')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" disabled={loading !== null} onClick={report} className="flex-1 border-zinc-700 text-zinc-300">
        <ShieldAlert className="mr-2 size-4" />
        Report
      </Button>
      <Button type="button" variant="outline" disabled={loading !== null} onClick={block} className="flex-1 border-zinc-700 text-zinc-300">
        <UserX className="mr-2 size-4" />
        Block
      </Button>
    </div>
  )
}
