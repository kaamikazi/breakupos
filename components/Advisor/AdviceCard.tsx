import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { AIAdvice, AdviceType } from '@/types'

const TYPE_LABELS: Record<AdviceType, string> = {
  general: 'General',
  red_flag_analysis: 'Red Flag Analysis',
  move_recommendation: 'Move Rec',
  exit_strategy: 'Exit Strategy',
  draft_reply: 'Draft Reply',
  message_analysis: 'Message Analysis',
}

const TYPE_COLORS: Record<AdviceType, string> = {
  general: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  red_flag_analysis: 'bg-red-500/20 text-red-300 border-red-500/30',
  move_recommendation: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  exit_strategy: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  draft_reply: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  message_analysis: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

interface AdviceCardProps {
  advice: AIAdvice
}

export function AdviceCard({ advice }: AdviceCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge
          variant="outline"
          className={`text-xs border ${TYPE_COLORS[advice.advice_type as AdviceType]}`}
        >
          {TYPE_LABELS[advice.advice_type as AdviceType]}
        </Badge>
        <span className="text-xs text-zinc-500">
          {format(parseISO(advice.created_at), 'MMM d, h:mma')}
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-2 italic">&ldquo;{advice.question}&rdquo;</p>
      <p className="text-sm text-zinc-200 leading-relaxed">{advice.advice}</p>
    </div>
  )
}
