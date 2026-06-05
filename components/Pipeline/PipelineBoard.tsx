'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core'
import { PipelineColumn } from './PipelineColumn'
import { SituationCard } from './SituationCard'
import { STAGES } from '@/types'
import type { Situation, Stage } from '@/types'
import { toast } from 'sonner'

interface PipelineBoardProps {
  initialSituations: Situation[]
}

export function PipelineBoard({ initialSituations }: PipelineBoardProps) {
  const [situations, setSituations] = useState<Situation[]>(initialSituations)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeSituation = situations.find(s => s.id === activeId) ?? null

  const getStageSituations = useCallback(
    (stage: Stage) => situations.filter(s => s.stage === stage),
    [situations]
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeSit = situations.find(s => s.id === activeId)
    if (!activeSit) return

    // overId is either a stage id or a situation id
    const targetStage = STAGES.find(s => s.id === overId)?.id
      ?? situations.find(s => s.id === overId)?.stage

    if (!targetStage || targetStage === activeSit.stage) return

    // Optimistic update
    setSituations(prev =>
      prev.map(s => s.id === activeId ? { ...s, stage: targetStage as Stage } : s)
    )

    try {
      const res = await fetch(`/api/situations/${activeId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setSituations(prev =>
        prev.map(s => s.id === activeId ? { ...s, stage: activeSit.stage } : s)
      )
      toast.error('Failed to update stage')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={e => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
        {STAGES.map(stage => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            situations={getStageSituations(stage.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeSituation && (
          <div className="rotate-3 scale-105">
            <SituationCard situation={activeSituation} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
