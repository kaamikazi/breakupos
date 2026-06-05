'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Copy, Heart, Shield, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { DATING_LABELS, REPORT_REASON_VALUES } from '@/lib/dating'
import { getVerificationBadge } from '@/lib/dating-beta'
import type { DatingProfileWithPhotos, ReportReason } from '@/types'

type LikeLimit = { limit: number | null; remaining: number | null; canLike: boolean }

export function DiscoveryFeed() {
  const [profiles, setProfiles] = useState<DatingProfileWithPhotos[]>([])
  const [isPro, setIsPro] = useState(false)
  const [likeLimit, setLikeLimit] = useState<LikeLimit | null>(null)
  const [whoLikedYou, setWhoLikedYou] = useState<{ locked: boolean; count: number } | null>(null)
  const [boostCopy, setBoostCopy] = useState('')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<ReportReason>('other')
  const [reportDetails, setReportDetails] = useState('')
  const [filters, setFilters] = useState({
    min_age: '',
    max_age: '',
    city: '',
    relationship_goal: '',
    shared_interests: false,
    min_quality: '',
    recently_active: false,
  })
  const [icebreakerTone, setIcebreakerTone] = useState('warm')
  const [icebreaker, setIcebreaker] = useState('')
  const [generatingIcebreaker, setGeneratingIcebreaker] = useState(false)

  const loadProfiles = async (query = '') => {
    setLoading(true)
    setError(null)
    const response = await fetch(`/api/dating/discover${query}`)
    setLoading(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Discovery could not load right now.')
      return
    }
    const payload = await response.json()
    setProfiles(payload.profiles ?? [])
    setIsPro(Boolean(payload.isPro))
    setLikeLimit(payload.like_limit ?? null)
    setWhoLikedYou(payload.who_liked_you ?? null)
    setBoostCopy(payload.boost?.copy ?? '')
  }

  useEffect(() => {
    let cancelled = false
    async function initialLoad() {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dating/discover')
      if (cancelled) return
      setLoading(false)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setError(typeof payload?.error === 'string' ? payload.error : 'Discovery could not load right now.')
        return
      }
      const payload = await response.json()
      setProfiles(payload.profiles ?? [])
      setIsPro(Boolean(payload.isPro))
      setLikeLimit(payload.like_limit ?? null)
      setWhoLikedYou(payload.who_liked_you ?? null)
      setBoostCopy(payload.boost?.copy ?? '')
    }
    void initialLoad()
    return () => {
      cancelled = true
    }
  }, [])

  const currentProfile = profiles[index]
  const primaryPhoto = useMemo(() => currentProfile?.photos?.[0]?.photo_url, [currentProfile])
  const verification = useMemo(() => getVerificationBadge(currentProfile?.verification_status), [currentProfile])

  const advance = () => {
    setIcebreaker('')
    setIndex(current => current + 1)
  }

  const applyFilters = async () => {
    if (!isPro) return
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        if (value) params.set(key, 'true')
      } else if (value) {
        params.set(key, value)
      }
    })
    setIndex(0)
    await loadProfiles(`?${params.toString()}`)
  }

  const act = async (type: 'like' | 'pass' | 'block' | 'report') => {
    if (!currentProfile) return
    setActing(true)
    setError(null)
    const endpoint = type === 'report' ? '/api/dating/report' : `/api/dating/${type}`
    const body = type === 'report'
      ? { target_user_id: currentProfile.user_id, reason: reportReason, details: reportDetails }
      : { target_user_id: currentProfile.user_id }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setActing(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Action failed.')
      return
    }
    const payload = await response.json().catch(() => null)
    if (type === 'like' && payload?.matched) toast.success("It's a match")
    if (type === 'block') toast.success('Profile blocked')
    if (type === 'report') {
      toast.success('Report submitted')
      setReportDetails('')
    }
    if (payload?.like_limit) setLikeLimit(payload.like_limit)
    advance()
  }

  const generateIcebreaker = async () => {
    if (!currentProfile || !isPro) return
    setGeneratingIcebreaker(true)
    setError(null)
    const response = await fetch('/api/dating/icebreaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: currentProfile.user_id, tone: icebreakerTone }),
    })
    setGeneratingIcebreaker(false)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not generate an icebreaker.')
      return
    }
    const payload = await response.json()
    setIcebreaker(payload.suggestion ?? '')
  }

  if (loading) {
    return <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-300">Loading discovery profiles...</div>
  }

  if (error && profiles.length === 0) {
    return <EmptyState icon="!" title="Discovery is unavailable" description={error} actionLabel="Try again" onAction={() => window.location.reload()} />
  }

  if (!currentProfile) {
    return (
      <EmptyState
        icon="♡"
        title="No profiles to show"
        description="You have reached the end of the current discovery pool. Hidden, blocked, liked, passed, and photo-less profiles are excluded."
        actionLabel="Edit dating profile"
        onAction={() => window.location.assign('/dating/profile')}
      />
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,560px)_1fr]">
      <Card className="overflow-hidden border-zinc-800 bg-zinc-900">
        <div className="aspect-[4/5] bg-zinc-800">
          {primaryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">No photo yet</div>
          )}
        </div>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="text-3xl font-semibold text-white">{currentProfile.display_name}, {currentProfile.age}</h2>
            <p className="text-sm text-zinc-400">{currentProfile.city || 'City not shared'}</p>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">{currentProfile.bio || 'No bio yet.'}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{DATING_LABELS.relationshipGoal[currentProfile.relationship_goal]}</Badge>
            <Badge variant="outline">{DATING_LABELS.gender[currentProfile.gender]}</Badge>
            <Badge variant="outline">{verification.label}</Badge>
            {currentProfile.interests.map(interest => <Badge key={interest} variant="secondary">{interest}</Badge>)}
          </div>
          {currentProfile.compatibility_preview && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-50">
              <div className="font-semibold capitalize">{currentProfile.compatibility_preview.label} compatibility preview</div>
              <p className="mt-1 text-cyan-100/80">{currentProfile.compatibility_preview.reason}</p>
              <p className="mt-1 text-xs text-cyan-100/60">Confidence: {currentProfile.compatibility_preview.confidence}%. Lightweight signal, not science.</p>
            </div>
          )}
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
          {likeLimit && (
            <div className="text-xs text-zinc-400">
              {likeLimit.limit === null ? 'Pro likes: unlimited today' : `${likeLimit.remaining ?? 0}/${likeLimit.limit} likes remaining today`}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button disabled={acting} variant="outline" onClick={() => act('pass')} className="border-zinc-700 text-zinc-300">
              <X className="mr-2 size-4" /> Pass
            </Button>
            <Button disabled={acting || Boolean(likeLimit && !likeLimit.canLike)} onClick={() => act('like')} className="bg-pink-500 text-white hover:bg-pink-600">
              <Heart className="mr-2 size-4" /> Like
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="grid content-start gap-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Dating Pro</CardTitle>
            <CardDescription>Advanced filters, icebreakers, AI chat analysis, and more daily likes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isPro ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input value={filters.min_age} onChange={event => setFilters({ ...filters, min_age: event.target.value })} placeholder="Min age" className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100" />
                  <input value={filters.max_age} onChange={event => setFilters({ ...filters, max_age: event.target.value })} placeholder="Max age" className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100" />
                </div>
                <input value={filters.city} onChange={event => setFilters({ ...filters, city: event.target.value })} placeholder="City" className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100" />
                <select value={filters.relationship_goal} onChange={event => setFilters({ ...filters, relationship_goal: event.target.value })} className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100">
                  <option value="">Any relationship goal</option>
                  {Object.entries(DATING_LABELS.relationshipGoal).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={filters.min_quality} onChange={event => setFilters({ ...filters, min_quality: event.target.value })} placeholder="Min quality score" className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100" />
                <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={filters.shared_interests} onChange={event => setFilters({ ...filters, shared_interests: event.target.checked })} /> Shared interests</label>
                <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={filters.recently_active} onChange={event => setFilters({ ...filters, recently_active: event.target.checked })} /> Recently active</label>
                <Button onClick={applyFilters} variant="outline" className="w-full border-zinc-700 text-zinc-300">Apply filters</Button>
              </>
            ) : (
              <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-3 text-sm text-pink-100">
                Upgrade for advanced filters, AI icebreakers, AI chat analysis, more daily likes, who-liked-you, and boost previews.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="size-4 text-cyan-300" /> AI icebreaker</CardTitle>
            <CardDescription>Pro-only respectful first-message ideas from visible profile info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isPro ? <div className="text-sm text-zinc-500">Locked for Free users.</div> : (
              <>
                <select value={icebreakerTone} onChange={event => setIcebreakerTone(event.target.value)} className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100">
                  {['warm', 'playful', 'curious', 'direct'].map(tone => <option key={tone} value={tone}>{tone}</option>)}
                </select>
                <Button onClick={generateIcebreaker} disabled={generatingIcebreaker} variant="outline" className="w-full border-zinc-700 text-zinc-300">
                  {generatingIcebreaker ? 'Generating...' : 'Generate icebreaker'}
                </Button>
                {icebreaker && (
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-50">
                    <p>{icebreaker}</p>
                    <Button onClick={() => navigator.clipboard.writeText(icebreaker)} size="sm" className="mt-2 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                      <Copy className="mr-2 size-3" /> Copy
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Who liked you</CardTitle>
            <CardDescription>{whoLikedYou?.locked ? 'Pro preview' : 'Visible likes'}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            {whoLikedYou?.locked ? `${whoLikedYou.count} people may have liked you. Upgrade to reveal safely.` : `${whoLikedYou?.count ?? 0} visible incoming likes. Blocked users are excluded.`}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle className="text-white">Profile boost</CardTitle></CardHeader>
          <CardContent className="text-sm text-zinc-400">{boostCopy || 'Boost is planned for Pro. It is not changing ranking yet.'}</CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Safety tools</CardTitle>
            <CardDescription>Block removes this person from your view. Reports are stored for moderation review. See the Safety Center for guidance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select value={reportReason} onChange={event => setReportReason(event.target.value as ReportReason)} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
              {REPORT_REASON_VALUES.map(reason => <option key={reason} value={reason}>{DATING_LABELS.reportReason[reason]}</option>)}
            </select>
            <textarea value={reportDetails} onChange={event => setReportDetails(event.target.value.slice(0, 500))} placeholder="Optional details for moderation" className="min-h-20 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
            <Button disabled={acting} variant="outline" onClick={() => act('report')} className="w-full border-zinc-700 text-zinc-300">Report profile</Button>
            <Button disabled={acting} variant="outline" onClick={() => act('block')} className="w-full border-red-500/40 text-red-200">
              <Shield className="mr-2 size-4" /> Block user
            </Button>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-400">
          Keep early chats low-pressure. If a match becomes meaningful, Breakup OS can turn the connection into a situation for compatibility tracking later.
        </div>
        <Link href="/matches" className="text-sm font-medium text-pink-300 hover:text-pink-200">View matches</Link>
      </aside>
    </div>
  )
}
