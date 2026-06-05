import { Badge } from '@/components/ui/badge'
import { STAGES, STAGE_COLORS } from '@/types'
import type { Stage } from '@/types'

interface StageBadgeProps {
  stage: Stage
  size?: 'sm' | 'md'
}

export function StageBadge({ stage, size = 'sm' }: StageBadgeProps) {
  const stageInfo = STAGES.find(s => s.id === stage)
  const colorClass = STAGE_COLORS[stage]

  return (
    <Badge
      variant="outline"
      className={`${colorClass} border ${size === 'sm' ? 'text-xs px-2 py-0' : 'text-sm px-2.5 py-0.5'}`}
    >
      {stageInfo?.emoji} {stageInfo?.label ?? stage}
    </Badge>
  )
}
