'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bot, Copy, MoreHorizontal, RefreshCw, Send, Shield, Trash2, Unlock, UserX, X } from 'lucide-react'
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
  otherPublicName: string
  initialMessages: DatingMessage[]
  isBlocked: boolean
  blockedByCurrentUser: boolean
  isPro: boolean
}

export function MatchChatClient({
  matchId,
  currentUserId,
  otherProfile,
  otherPublicName,
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
  const [activePanel, setActivePanel] = useState<'ai' | 'safety' | null>(null)
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
  const lastOutgoingReadId = useMemo(
    () => [...sortedMessages].reverse().find(message => message.sender_id === currentUserId && message.read_at && !message.deleted_at)?.id ?? null,
    [currentUserId, sortedMessages]
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
    <section className="overflow-hidden bg-zinc-950 shadow-2xl shadow-black/30 md:rounded-3xl md:border md:border-zinc-800">
      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-2.5 py-2 backdrop-blur md:px-4 md:py-3">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="inline-flex size-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 md:hidden" aria-label="Back to matches">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-500/15 text-base font-bold text-pink-200 md:size-11 md:rounded-2xl">
            {primaryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- User uploaded dating photos are served directly in beta.
              <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              otherPublicName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-white">{otherPublicName}</h2>
            <p className="truncate text-[11px] text-zinc-500 md:text-xs">{blockState.isBlocked ? blockState.message : 'Matched conversation'}</p>
          </div>
          <Button type="button" onClick={refresh} disabled={loading} variant="ghost" size="icon" className="hidden text-zinc-300 sm:inline-flex">
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
                <button type="button" onClick={convertMatch} disabled={converting} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60">
                  <Bot className="size-4 text-pink-300" /> {converting ? 'Tracking...' : 'Track in OS'}
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
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActivePanel(panel => panel === 'ai' ? null : 'ai')}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${activePanel === 'ai' ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900/70 text-zinc-300'}`}
          >
            AI Reply
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(panel => panel === 'safety' ? null : 'safety')}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${activePanel === 'safety' ? 'border-amber-300/50 bg-amber-300/15 text-amber-100' : 'border-zinc-800 bg-zinc-900/70 text-zinc-300'}`}
          >
            Safety
          </button>
          <button
            type="button"
            onClick={convertMatch}
            disabled={converting}
            className="shrink-0 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1.5 font-semibold text-pink-100 disabled:opacity-60"
          >
            {converting ? 'Tracking...' : 'Track in OS'}
          </button>
        </div>
      </div>

      {activePanel && (
        <div className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 md:px-5">
          {activePanel === 'safety' ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100 md:text-sm">
              <p>Safety tip: Keep chats low-pressure and avoid sharing personal details early. <Link href="/safety" className="font-semibold underline">Open Safety Center</Link>.</p>
              <button type="button" onClick={() => setActivePanel(null)} className="rounded-full p-1 text-amber-100/70 hover:bg-amber-500/10" aria-label="Close safety tip">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><Bot className="size-4" /> AI reply helper</div>
                <button type="button" onClick={() => setActivePanel(null)} className="rounded-full p-1 text-cyan-100/70 hover:bg-cyan-500/10" aria-label="Close AI helper">
                  <X className="size-4" />
                </button>
              </div>
              {!isPro ? (
                <p className="text-sm text-cyan-100/70">Pro can draft replies and analyze recent chat context.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 overflow-x-auto">
                    <select value={tone} onChange={event => setTone(event.target.value as ReplyHelperTone)} className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
                      {REPLY_HELPER_TONES.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <Button onClick={generateReply} disabled={suggesting} variant="outline" className="border-cyan-300/40 text-cyan-100">
                      {suggesting ? 'Drafting...' : 'Draft'}
                    </Button>
                    <Button onClick={analyzeChat} disabled={analyzing} variant="outline" className="border-zinc-700 text-zinc-200">
                      {analyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  </div>
                  {suggestion && (
                    <div className="rounded-xl border border-cyan-500/20 bg-zinc-950/70 p-3 text-sm text-cyan-50">
                      <p className="whitespace-pre-wrap">{suggestion}</p>
                      <Button type="button" onClick={() => setBody(suggestion)} className="mt-2 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                        <Copy className="mr-2 size-4" /> Use
                      </Button>
                    </div>
                  )}
                  {chatAnalysis && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300 md:text-sm">
                      <p className="font-semibold text-white">Interest level: {chatAnalysis.interestLevel}%</p>
                      <p className="mt-1">Consistency: {chatAnalysis.consistency}</p>
                      <p className="mt-1">Mixed signals: {chatAnalysis.mixedSignals.join('; ') || 'None flagged'}</p>
                      <p className="mt-1">Red flags: {chatAnalysis.redFlags.join('; ') || 'None flagged'}</p>
                      <p className="mt-1">Next move: {chatAnalysis.recommendedNextMove}</p>
                      <p className="mt-2 text-[11px] text-zinc-500">Confidence: {chatAnalysis.confidence}%. AI can be wrong; use judgment.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex h-[calc(100dvh-7.25rem)] min-h-[360px] flex-col md:h-[720px]">
        <div className="flex-1 overflow-y-auto px-2.5 py-3 md:px-5 md:py-4">
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
                      <div className={`group flex max-w-[80%] items-end gap-1.5 sm:max-w-[70%] ${mine ? 'flex-row-reverse' : ''}`}>
                        <div className={`rounded-3xl px-3.5 py-2 text-sm shadow-sm md:px-4 md:py-2.5 ${mine ? 'rounded-br-md bg-pink-500 text-white' : 'rounded-bl-md bg-zinc-800 text-zinc-100'} ${deleted ? 'italic opacity-70' : ''}`}>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{getDeletedMessageDisplay(message)}</p>
                          <div className={`mt-1 text-right text-[10px] ${mine ? 'text-pink-100/70' : 'text-zinc-500'}`}>
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {mine && !deleted && (
                          <button
                            type="button"
                            onClick={() => deleteMessage(message.id)}
                            className="mb-1 rounded-full p-1 text-zinc-600 opacity-70 transition hover:bg-zinc-900 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Delete message"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {mine && message.id === lastOutgoingReadId && (
                      <p className="mt-1 pr-1 text-right text-[10px] text-zinc-600">Seen</p>
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && <div className="mx-3 mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 sm:mx-5">{error}</div>}

        {blockState.isBlocked ? (
          <div className="border-t border-zinc-800 bg-zinc-950 p-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:p-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-100 md:p-4">
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
          <form onSubmit={sendMessage} className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950 p-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:p-4">
            <div className="flex items-end gap-2 rounded-[1.75rem] border border-zinc-800 bg-zinc-900 p-1.5">
              <Textarea
                value={body}
                onChange={event => setBody(event.target.value.slice(0, CHAT_MESSAGE_MAX_LENGTH))}
                placeholder="Write a message..."
                className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0"
              />
              <Button type="submit" disabled={sending || !body.trim()} size="icon" className="size-11 shrink-0 rounded-full bg-pink-500 text-white hover:bg-pink-600">
                <Send className="size-4" />
                <span className="sr-only">{sending ? 'Sending' : 'Send'}</span>
              </Button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-zinc-600">
              <span>Low-pressure works best.</span>
              {body.length > 0 && <span>{body.length}/{CHAT_MESSAGE_MAX_LENGTH}</span>}
            </div>
          </form>
        )}
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
