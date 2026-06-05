import { calculateCompatibilityBreakdown } from '@/lib/compatibility'
import type { Interaction, Situation } from '@/types'

interface CompatibilityBreakdownProps {
  situation: Situation
  interactions: Interaction[]
}

const LABELS = [
  ['greenFlags', 'Green flags'],
  ['redFlags', 'Red flags'],
  ['emotionalInvestment', 'Investment'],
  ['sentimentTrend', 'Sentiment trend'],
  ['responseConsistency', 'Consistency'],
  ['emotionalImbalance', 'Imbalance'],
  ['ghostingDuration', 'Ghosting'],
  ['conflictRecovery', 'Conflict repair'],
  ['recency', 'Recency'],
  ['stage', 'Stage'],
] as const

export function CompatibilityBreakdown({ situation, interactions }: CompatibilityBreakdownProps) {
  const breakdown = calculateCompatibilityBreakdown(situation, interactions)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Score Breakdown</h3>
          <p className="text-xs text-zinc-500">Base score is 50, then adjusted by behavior and signal quality.</p>
        </div>
        <div className="text-2xl font-bold text-white">{breakdown.score}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {LABELS.map(([key, label]) => {
          const value = breakdown[key]
          return (
            <div key={key} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className={value >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                {value > 0 ? '+' : ''}{value}
              </span>
            </div>
          )
        })}
      </div>
      {breakdown.notes.length > 0 && (
        <div className="space-y-1">
          {breakdown.notes.map(note => (
            <p key={note} className="text-xs text-zinc-400">- {note}</p>
          ))}
        </div>
      )}
    </div>
  )
}
