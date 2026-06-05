'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bot, Copy, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { CHAT_MESSAGE_MAX_LENGTH, REPLY_HELPER_TONES, getDeletedMessageDisplay, type ReplyHelperTone } from '@/lib/dating-chat'
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
  const bottomRef = useRef<HTMLDivElement | null>(null)

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

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || blocked) return
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
  }

  const blockUser = async () => {
    const response = await fetch('/api/dating/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: otherProfile.user_id }),
    })
    if (!response.ok) {
      toast.error('Could not block user')
      return
    }
    setBlocked(true)
    setBlockedByMe(true)
    toast.success('User blocked')
  }

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

  return (
    <section className="grid gap-4">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-white">Messages</CardTitle>
              <CardDescription>Matched with {otherProfile.display_name}. Keep it consensual, kind, and low-pressure.</CardDescription>
            </div>
            <Button onClick={refresh} disabled={loading} variant="outline" className="border-zinc-700 text-zinc-300">
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[52vh] min-h-[360px] overflow-y-auto p-4">
            {sortedMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center text-sm text-zinc-500">
                No messages yet. Start simple and respectful.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMessages.map(message => {
                  const mine = message.sender_id === currentUserId
                  const deleted = Boolean(message.deleted_at)
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-100'} ${deleted ? 'italic opacity-70' : ''}`}>
                        <p className="whitespace-pre-wrap break-words">{getDeletedMessageDisplay(message)}</p>
                        <div className={`mt-1 flex items-center gap-2 text-[11px] ${mine ? 'text-pink-100' : 'text-zinc-400'}`}>
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
                  )
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && <div className="mx-4 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

          {blocked ? (
            <div className="border-t border-zinc-800 p-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
                Messaging is disabled because {blockedByMe ? 'you blocked this user' : 'one of you blocked the other'}. Older messages remain visible for your records.
              </div>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="border-t border-zinc-800 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Textarea
                  value={body}
                  onChange={event => setBody(event.target.value.slice(0, CHAT_MESSAGE_MAX_LENGTH))}
                  placeholder="Write a message..."
                  className="min-h-20 flex-1"
                />
                <Button type="submit" disabled={sending || !body.trim()} className="bg-pink-500 text-white hover:bg-pink-600 sm:self-end">
                  <Send className="mr-2 size-4" /> {sending ? 'Sending...' : 'Send'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">{body.length}/{CHAT_MESSAGE_MAX_LENGTH}</p>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white"><Bot className="size-5 text-cyan-300" /> AI reply helper</CardTitle>
          <CardDescription>Pro-only reply drafting from recent chat context. Safety guidance is included for coercion, harassment, abuse, stalking, or crisis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isPro ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              Upgrade to Pro to draft replies from match context.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={tone}
                  onChange={event => setTone(event.target.value as ReplyHelperTone)}
                  className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
                >
                  {REPLY_HELPER_TONES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <Button onClick={generateReply} disabled={suggesting} variant="outline" className="border-zinc-700 text-zinc-300">
                  {suggesting ? 'Drafting...' : 'Draft reply'}
                </Button>
              </div>
              {suggestion && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                  <p className="whitespace-pre-wrap">{suggestion}</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setBody(suggestion)
                      toast.success('Suggestion copied into composer')
                    }}
                    className="mt-3 bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
                  >
                    <Copy className="mr-2 size-4" /> Use suggestion
                  </Button>
                </div>
              )}
              <div className="border-t border-zinc-800 pt-3">
                <Button onClick={analyzeChat} disabled={analyzing} variant="outline" className="border-zinc-700 text-zinc-300">
                  {analyzing ? 'Analyzing...' : 'Analyze recent chat'}
                </Button>
                {chatAnalysis && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                    <div className="font-semibold text-white">Interest level: {chatAnalysis.interestLevel}%</div>
                    <p className="mt-1">Consistency: {chatAnalysis.consistency}</p>
                    <p className="mt-1">Mixed signals: {chatAnalysis.mixedSignals.join('; ')}</p>
                    <p className="mt-1">Red flags: {chatAnalysis.redFlags.join('; ')}</p>
                    <p className="mt-1">Next move: {chatAnalysis.recommendedNextMove}</p>
                    <p className="mt-2 text-xs text-zinc-500">Confidence: {chatAnalysis.confidence}%. AI can be wrong; treat this as reflection, not proof.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
        If a message feels coercive, threatening, explicit without consent, about minors, stalker-like, or crisis-related, stop engaging and use safety support. You can report or block without deleting the message history. Read the <Link href="/safety" className="underline">Safety Center</Link>.
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={reportUser} variant="outline" className="border-amber-300/40 text-amber-100">
            Report user
          </Button>
          <Button type="button" onClick={blockUser} disabled={blocked} variant="outline" className="border-red-500/40 text-red-200">
            {blocked ? 'Blocked' : 'Block user'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Track this in Breakup OS</h3>
          <p className="text-sm text-zinc-400">Create a situation from this match without duplicating an existing conversion.</p>
        </div>
        <Button onClick={convertMatch} disabled={converting} className="bg-zinc-100 text-zinc-950 hover:bg-white">
          {converting ? 'Creating...' : 'Track this in Breakup OS'}
        </Button>
      </div>
    </section>
  )
}
