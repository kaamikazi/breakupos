'use client'

import { useEffect, useState } from 'react'
import { Crown, Flag, Flame, Scale } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  SOCIAL_SECTION_LABELS,
  SOCIAL_SECTION_VALUES,
  type SocialSection,
} from '@/lib/social'

type Verdict = { total: number; lovePct: number; redFlagPct: number; label: string }

type RankedPost = {
  id: string
  image_url: string
  section: SocialSection
  display_name: string
  love_count: number
  red_flag_count: number
  reactions_today: number
  verdict: Verdict
}

type RankingsPayload = {
  top_loved: RankedPost[]
  most_red_flagged: RankedPost[]
  most_divisive: RankedPost[]
  trending_today: RankedPost[]
}

const BOARDS = [
  { key: 'top_loved', title: 'Top Loved', icon: Crown, tint: 'text-pink-300', note: 'Highest Love count' },
  { key: 'most_red_flagged', title: 'Most Red-Flagged', icon: Flag, tint: 'text-red-300', note: 'These situations got red-flagged the most' },
  { key: 'most_divisive', title: 'Most Divisive', icon: Scale, tint: 'text-amber-300', note: 'Closest to a 50/50 community split' },
  { key: 'trending_today', title: 'Trending Today', icon: Flame, tint: 'text-orange-300', note: 'Most reactions in the last 24 hours' },
] as const

export function RankingsClient() {
  const [section, setSection] = useState<SocialSection | ''>('')
  const [rankings, setRankings] = useState<RankingsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const params = section ? `?section=${section}` : ''
        const response = await fetch(`/api/social/rankings${params}`)
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Rankings could not load right now.')
        }
        if (!cancelled) setRankings(payload as RankingsPayload)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Rankings could not load right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [section])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSection('')}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            section === '' ? 'border-pink-500 bg-pink-500/15 text-pink-200' : 'border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          All sections
        </button>
        {SOCIAL_SECTION_VALUES.map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              section === value ? 'border-pink-500 bg-pink-500/15 text-pink-200' : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            {SOCIAL_SECTION_LABELS[value]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">Counting the verdicts...</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {BOARDS.map(board => {
            const Icon = board.icon
            const items = rankings?.[board.key] ?? []
            return (
              <section key={board.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Icon className={`size-4 ${board.tint}`} />
                  <h2 className="text-base font-bold text-white">{board.title}</h2>
                </div>
                <p className="mb-4 text-xs text-zinc-500">{board.note}</p>

                {items.length === 0 ? (
                  <EmptyState title="Nothing ranked yet" description="Not enough reactions in this section so far." />
                ) : (
                  <ol className="space-y-3">
                    {items.map((post, position) => (
                      <li key={post.id} className="flex items-center gap-3">
                        <span className="w-5 text-center text-sm font-bold text-zinc-500">{position + 1}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded Supabase Storage images are intentionally served directly to avoid optimizer cost during beta. */}
                        <img src={post.image_url} alt="" className="size-14 rounded-lg border border-zinc-800 object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{post.display_name}</p>
                          <p className="text-xs text-zinc-500">{SOCIAL_SECTION_LABELS[post.section]}</p>
                          {post.verdict.total > 0 && (
                            <div className="mt-1 flex h-1.5 max-w-40 overflow-hidden rounded-full bg-zinc-800">
                              <div className="bg-pink-500" style={{ width: `${post.verdict.lovePct}%` }} />
                              <div className="bg-red-600" style={{ width: `${post.verdict.redFlagPct}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-zinc-400">
                          <p>❤️ {post.love_count}</p>
                          <p>🚩 {post.red_flag_count}</p>
                          {board.key === 'trending_today' && <p className="text-orange-300">🔥 {post.reactions_today}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
