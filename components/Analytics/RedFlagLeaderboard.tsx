'use client'

import type { Situation } from '@/types'

interface RedFlagLeaderboardProps {
  situations: Situation[]
}

export function RedFlagLeaderboard({ situations }: RedFlagLeaderboardProps) {
  const flagCounts: Record<string, number> = {}

  situations.forEach(s => {
    s.red_flags?.forEach(flag => {
      flagCounts[flag] = (flagCounts[flag] ?? 0) + 1
    })
  })

  const ranked = Object.entries(flagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const hasPattern = ranked.some(([, count]) => count >= 3)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">🚩 Red Flag Leaderboard</h3>

      {hasPattern && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">
            You keep attracting the same type. The data does not lie.
          </p>
        </div>
      )}

      {ranked.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6">
          No red flags logged. Either they are perfect or you are not paying attention.
        </p>
      ) : (
        <div className="space-y-2">
          {ranked.map(([flag, count], i) => (
            <div key={flag} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-zinc-500 w-5 tabular-nums">{i + 1}.</span>
                <span className="text-sm text-zinc-200 truncate">{flag}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-1.5 rounded-full bg-red-500/20 overflow-hidden" style={{ width: 60 }}>
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, (count / (ranked[0]?.[1] ?? 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-red-400 tabular-nums w-12">
                  {count} {count === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
