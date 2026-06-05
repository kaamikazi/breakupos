'use client'

import { format, parseISO } from 'date-fns'
import { AddInteractionForm } from './AddInteractionForm'
import type { Interaction, InteractionType, Sentiment } from '@/types'

const INTERACTION_ICONS: Record<InteractionType, string> = {
  message: '💬',
  date: '📅',
  call: '📞',
  ghost: '👻',
  breadcrumb: '🍞',
  left_on_read: '👁️',
  relapse: '↩',
  boundary: '🧱',
  conflict: '⚠️',
  repair: '🧩',
  stage_change: '➡',
}

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: 'text-emerald-400',
  neutral: 'text-zinc-400',
  negative: 'text-red-400',
}

interface InteractionLogProps {
  situationId: string
  interactions: Interaction[]
  onUpdate: (interactions: Interaction[]) => void
}

export function InteractionLog({ situationId, interactions, onUpdate }: InteractionLogProps) {
  const handleAdded = (interaction: Interaction) => {
    onUpdate([interaction, ...interactions])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Interaction Timeline</h3>
        <AddInteractionForm situationId={situationId} onAdded={handleAdded} />
      </div>

      {interactions.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">
          No interactions logged yet. Everything starts somewhere.
        </p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />
          <div className="space-y-3">
            {interactions.map(interaction => (
              <div key={interaction.id} className="flex gap-3 pl-10 relative">
                <div className="absolute left-0 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-base">
                  {INTERACTION_ICONS[interaction.type as InteractionType]}
                </div>
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-xs font-medium capitalize ${SENTIMENT_COLORS[interaction.sentiment as Sentiment]}`}>
                      {interaction.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {format(parseISO(interaction.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {interaction.note && (
                    <p className="text-sm text-zinc-300">{interaction.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
