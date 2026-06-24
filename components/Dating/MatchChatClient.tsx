'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bot, Copy, MoreHorizontal, RefreshCw, Send, Shield, Trash2, Unlock, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { createClient } from '@/lib/supabase'
import {
  CHAT_MESSAGE_MAX_LENGTH,
  REPLY_HELPER_TONES,
  getChatBlockState,
  getDeletedMessageDisplay,
  type ReplyHelperTone,
} from '@/lib/dating-chat'
import type { DatingMessage, DatingProfileWithPhotos } from '@/types'

interface MatchChatClientProps {
  matchId: string
  currentUserId: string
  otherProfile: DatingProfileWithPhotos
  initialMessages: DatingMessage[]
  isBlocked: boolean
  blockedByCurrentUser: boolean
  isPro: boolean
}

export function MatchChatClient({
  matchId,
  currentUserId,
  otherProfile,
  initialMessages,
  isBlocked,
  blockedByCurrentUser,
  isPro,
}: MatchChatClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<DatingMessage[]>(initialMessages)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tone, setTone] = useState<ReplyHelperTone>('gentle')
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [chatAnalysis, setChatAnalysis] = useState<{
    interestLevel: number
    consistency: string
    mixedSignals: string[]
    redFlags: string[]
    recommendedNextMove: string
    confidence: number
  } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [converting, setConverting] = useState(false)
  const [blocked, setBlocked] = useState(isBlocked)
  const [blockedByMe, setBlockedByMe] = useState(blockedByCurrentUser)
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false)
  const [confirmUnblockOpen, setConfirmUnblockOpen] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [unblocking, setUnblocking] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const primaryPhoto = otherProfile.photos[0]?.photo_url
  const blockState = getChatBlockState(
    blocked ? [{ blocker_user_id: blockedByMe ? currentUserId : otherProfile.user_id, blocked_user_id: blockedByMe ? otherProfile.user_id : currentUserId }] : [],
    currentUserId,
    otherProfile.user_id
  )

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [sortedMessages.length])

  useEffect(() => {
    const supabase = createClient()
    let pollingId: ReturnType<typeof setInterval> | null = null

    async function fetchMessages() {
      const response = await fetch(`/api/dating/matches/${matchId}/messages`)
      if (!response.ok) return
      const nextMessages = await response.json()
      setMessages(nextMessages)
    }

    const channel = supabase
      .channel(`dating-messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dating_messages', filter: `match_id=eq.${matchId}` },
        payload => {
          const next = payload.new as DatingMessage | null
          if (!next) return
          setMessages(current => {
            const withoutDuplicate = current.filter(message => message.id !== next.id)
            return [...withoutDuplicate, next]
          })
        }
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          pollingId = setInterval(fetchMessages, 5000)
        }
      })

    return () => {
      if (pollingId) clearInterval(pollingId)
      supabase.removeChannel(channel)
    }
  }, [matchId])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    const response = await fetch(`/api/dating/matches/${matchId}/messages`)
    setLoading(false)
    if (!response.ok) {
      setError('Could not refresh messages.')
      return
    }
    setMessages(await response.json())
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || blockState.composerDisabled) return
    setSending(true)
    setError(null)
    const response = await fetch(`/api/dating/matches/${matchId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: trimmed }),
    })
    setSending(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not send message.')
      return
    }
    const message = await response.json()
    setMessages(current => [...current.filter(item => item.id !== message.id), message])
    setBody('')
  }

  const deleteMessage = async (messageId: string) => {
    const response = await fetch(`/api/dating/matches/${matchId}/messages/${messageId}`, { method: 'DELETE' })
    if (!response.ok) {
      toast.error('Could not delete message')
      return
    }
    const deleted = await response.json()
    setMessages(current => current.map(message => message.id === deleted.id ? deleted : message))
  }

  const generateReply = async () => {
    if (!isPro) return
    setSuggesting(true)
    setError(null)
    const response = await fetch(`/api/dating/matches/${matchId}/reply-helper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone }),
    })
    setSuggesting(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not generate a reply.')
      return
    }
    const payload = await response.json()
    setSuggestion(payload.suggestion ?? '')
  }

  const analyzeChat = async () => {
    if (!isPro) return
    setAnalyzing(true)
    setError(null)
    const response = await fetch(`/api/dating/matches/${matchId}/analyze`, { method: 'POST' })
    setAnalyzing(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not analyze chat.')
      return
    }
    const payload = await response.json()
    setChatAnalysis(payload.analysis ?? null)
  }

  const convertMatch = async () => {
    setConverting(true)
    setError(null)
    const response = await fetch(`/api/dating/matches/${matchId}/convert`, { method: 'POST' })
    setConverting(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not create a situation.')
      return
    }
    const payload = await response.json()
    router.push(`/situation/${payload.situation_id}`)
  }

  const reportUser = async () => {
    const response = await fetch('/api/dating/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_user_id: otherProfile.user_id,
        reason: 'harassment',
        details: 'Reported from match chat. Please review recent messages if available.',
      }),
    })
    if (!response.ok) {
      toast.error('Could not submit report')
      return
    }
    toast.success('Report submitted')
    setActionsOpen(false)
  }

  const blockUser = async () => {
    setBlocking(true)
    const response = await fetch('/api/dating/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: otherProfile.user_id }),
    })
    setBlocking(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not block user')
      return
    }
    setBlocked(true)
    setBlockedByMe(true)
    setConfirmBlockOpen(false)
    setActionsOpen(false)
    toast.success('User blocked')
  }

  const unblockUser = async () => {
    setUnblocking(true)
    const response = await fetch('/api/dating/block', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: otherProfile.user_id }),
    })
    setUnblocking(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not unblock user')
      return
    }
    setBlocked(false)
    setBlockedByMe(false)
    setConfirmUnblockOpen(false)
    toast.success('User unblocked')
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/30">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-800 text-zinc-300 sm:hidden" aria-label="Back to matches">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-pink-500/15 text-lg font-bold text-pink-200">
            {primaryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- User uploaded dating photos are served directly in beta.
              <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              otherProfile.display_name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-white">{otherProfile.display_name}</h2>
            <p className="truncate text-xs text-zinc-500">{blockState.isBlocked ? blockState.message : 'Matched conversation'}</p>
          </div>
          <Button type="button" onClick={refresh} disabled={loading} variant="ghost" size="icon" className="text-zinc-300">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="relative">
            <Button type="button" onClick={() => setActionsOpen(open => !open)} variant="ghost" size="icon" className="text-zinc-300" aria-label="Conversation actions">
              <MoreHorizontal className="size-5" />
            </Button>
            {actionsOpen && (
              <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
                <button type="button" onClick={reportUser} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900">
                  <Shield className="size-4 text-amber-300" /> Report user
                </button>
                {blockedByMe ? (
                  <button type="button" onClick={() => setConfirmUnblockOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900">
                    <Unlock className="size-4 text-cyan-300" /> Unblock user
                  </button>
                ) : (
                  <button type="button" disabled={blocked && !blockedByMe} onClick={() => setConfirmBlockOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
                    <UserX className="size-4" /> Block user
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100dvh-220px)] min-h-[520px] flex-col sm:h-[720px]">
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {sortedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-sm rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/70 p-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-200">
                  <Send className="size-5" />
                </div>
                <h3 className="font-semibold text-white">Start the conversation gently</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">No messages yet. A simple, respectful opener is enough.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMessages.map((message, index) => {
                const mine = message.sender_id === currentUserId
                const deleted = Boolean(message.deleted_at)
                const previous = sortedMessages[index - 1]
                const showDate = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString()
                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="my-4 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                        {new Date(message.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-3xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[70%] ${mine ? 'rounded-br-md bg-pink-500 text-white' : 'rounded-bl-md bg-zinc-800 text-zinc-100'} ${deleted ? 'italic opacity-70' : ''}`}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{getDeletedMessageDisplay(message)}</p>
                        <div className={`mt-1.5 flex items-center gap-2 text-[11px] ${mine ? 'text-pink-100' : 'text-zinc-400'}`}>
                          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {mine && message.read_at && !deleted && <span>Seen</span>}
                          {mine && !deleted && (
                            <button type="button" onClick={() => deleteMessage(message.id)} className="inline-flex items-center hover:underline">
                              <Trash2 className="mr-1 size-3" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && <div className="mx-3 mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 sm:mx-5">{error}</div>}

        {blockState.isBlocked ? (
          <div className="border-t border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
              <p className="font-semibold">{blockState.message}</p>
              <p className="mt-1 text-amber-100/80">{blockedByMe ? 'Messages are paused. Older messages stay visible, and you can unblock later.' : 'Messages are paused for privacy and safety.'}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {blockedByMe && (
                  <Button type="button" onClick={() => setConfirmUnblockOpen(true)} className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                    <Unlock className="mr-2 size-4" /> Unblock
                  </Button>
                )}
                <Button type="button" onClick={() => router.push('/matches')} variant="outline" className="border-zinc-700 text-zinc-200">
                  Back to messages
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <div className="flex items-end gap-2 rounded-3xl border border-zinc-800 bg-zinc-900 p-2">
              <Textarea
                value={body}
                onChange={event => setBody(event.target.value.slice(0, CHAT_MESSAGE_MAX_LENGTH))}
                placeholder="Write a message..."
                className="max-h-36 min-h-12 flex-1 resize-none border-0 bg-transparent px-3 py-2 focus-visible:ring-0"
              />
              <Button type="submit" disabled={sending || !body.trim()} size="icon" className="size-11 shrink-0 rounded-full bg-pink-500 text-white hover:bg-pink-600">
                <Send className="size-4" />
                <span className="sr-only">{sending ? 'Sending' : 'Send'}</span>
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
              <span>Keep it respectful and low-pressure.</span>
              <span>{body.length}/{CHAT_MESSAGE_MAX_LENGTH}</span>
            </div>
          </form>
        )}
      </div>

      <div className="grid gap-3 border-t border-zinc-800 bg-zinc-950 p-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><Bot className="size-4" /> AI reply helper</div>
          {!isPro ? (
            <p className="mt-2 text-sm text-cyan-100/70">Pro can draft replies and analyze recent chat context.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={tone} onChange={event => setTone(event.target.value as ReplyHelperTone)} className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
                  {REPLY_HELPER_TONES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <Button onClick={generateReply} disabled={suggesting} variant="outline" className="border-cyan-300/40 text-cyan-100">
                  {suggesting ? 'Drafting...' : 'Draft reply'}
                </Button>
                <Button onClick={analyzeChat} disabled={analyzing} variant="outline" className="border-zinc-700 text-zinc-200">
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
              {suggestion && (
                <div className="rounded-xl border border-cyan-500/20 bg-zinc-950/70 p-3 text-sm text-cyan-50">
                  <p className="whitespace-pre-wrap">{suggestion}</p>
                  <Button type="button" onClick={() => setBody(suggestion)} className="mt-3 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                    <Copy className="mr-2 size-4" /> Use suggestion
                  </Button>
                </div>
              )}
              {chatAnalysis && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm text-zinc-300">
                  <p className="font-semibold text-white">Interest level: {chatAnalysis.interestLevel}%</p>
                  <p className="mt-1">Consistency: {chatAnalysis.consistency}</p>
                  <p className="mt-1">Mixed signals: {chatAnalysis.mixedSignals.join('; ') || 'None flagged'}</p>
                  <p className="mt-1">Red flags: {chatAnalysis.redFlags.join('; ') || 'None flagged'}</p>
                  <p className="mt-1">Next move: {chatAnalysis.recommendedNextMove}</p>
                  <p className="mt-2 text-xs text-zinc-500">Confidence: {chatAnalysis.confidence}%. AI can be wrong; use judgment.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
          If a message feels coercive, threatening, explicit without consent, about minors, stalker-like, or crisis-related, stop engaging and use safety support. Read the <Link href="/safety" className="underline">Safety Center</Link>.
          <div className="mt-3">
            <Button onClick={convertMatch} disabled={converting} className="w-full bg-zinc-100 text-zinc-950 hover:bg-white">
              {converting ? 'Creating...' : 'Track this in Breakup OS'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        open={confirmBlockOpen}
        onOpenChange={setConfirmBlockOpen}
        title="Block this user?"
        body="You won't receive messages or requests from this person. You can unblock them later from Safety settings."
        confirmLabel="Block user"
        confirming={blocking}
        destructive
        onConfirm={blockUser}
      />
      <ConfirmActionDialog
        open={confirmUnblockOpen}
        onOpenChange={setConfirmUnblockOpen}
        title="Unblock this user?"
        body="They may be able to send requests or messages again if the rest of the app rules allow it. This will not automatically create a match or notify them."
        confirmLabel="Unblock user"
        confirming={unblocking}
        onConfirm={unblockUser}
      />
    </section>
  )
}
