'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { differenceInDays, parseISO } from 'date-fns'
import { HeartMeter } from '@/components/shared/HeartMeter'
import { getCompatibilityColor } from '@/lib/compatibility'
import { VIBE_COLORS } from '@/types'
import type { Situation, Vibe } from '@/types'

interface SituationCardProps {
  situation: Situation
}

export function SituationCard({ situation }: SituationCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: situation.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const daysSinceLast = situation.last_interaction
    ? differenceInDays(new Date(), parseISO(situation.last_interaction))
    : null

  const compatColor = getCompatibilityColor(situation.compatibility)
  const vibeColor = VIBE_COLORS[situation.vibe as Vibe]
  const topRedFlag = situation.red_flags?.[0]

  const handleClick = () => {
    if (isDragging) return
    router.push(`/situation/${situation.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-all select-none group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{situation.avatar_emoji}</span>
          <span className="font-medium text-white text-sm truncate sensitive-name">{situation.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Vibe dot */}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: vibeColor }}
            title={situation.vibe}
          />
          {/* Compatibility badge */}
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: compatColor }}
          >
            {situation.compatibility}
          </span>
        </div>
      </div>

      {/* Heart meter */}
      <HeartMeter value={situation.emotional_invest} size="sm" />

      {/* Last interaction */}
      {daysSinceLast !== null && (
        <div className={`mt-1.5 text-xs ${daysSinceLast > 7 ? 'text-red-400' : 'text-zinc-500'}`}>
          {daysSinceLast === 0
            ? 'Today'
            : daysSinceLast === 1
            ? 'Yesterday'
            : `${daysSinceLast}d ago`}
        </div>
      )}

      {/* Top red flag */}
      {topRedFlag && (
        <div className="mt-1.5 text-xs text-red-400 truncate">
          🚩 {topRedFlag}
        </div>
      )}
    </div>
  )
}
