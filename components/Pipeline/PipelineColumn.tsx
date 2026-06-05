'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SituationCard } from './SituationCard'
import type { Situation, Stage } from '@/types'

interface PipelineColumnProps {
  stage: { id: Stage; label: string; emoji: string; emptyMessage: string }
  situations: Situation[]
}

export function PipelineColumn({ stage, situations }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const avgCompat = situations.length
    ? Math.round(situations.reduce((s, sit) => s + sit.compatibility, 0) / situations.length)
    : null

  return (
    <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{stage.emoji}</span>
          <span className="text-sm font-semibold text-white">{stage.label}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 rounded-full px-1.5 py-0.5">
            {situations.length}
          </span>
        </div>
        {avgCompat !== null && (
          <span className="text-xs text-zinc-500">avg {avgCompat}</span>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-lg p-2 transition-colors ${
          isOver ? 'bg-zinc-800/60 ring-1 ring-pink-500/40' : 'bg-zinc-900/40'
        }`}
      >
        <SortableContext
          items={situations.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {situations.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <p className="text-xs text-zinc-600 text-center px-4">{stage.emptyMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {situations.map(sit => (
                <SituationCard key={sit.id} situation={sit} />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}
