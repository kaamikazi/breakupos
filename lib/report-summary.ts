import { z } from 'zod'
import { calculateCompatibilityBreakdown } from '@/lib/compatibility'
import type { Interaction, Situation } from '@/types'

export const reportRequestSchema = z.object({
  situation_id: z.string().uuid(),
})

export const reportAiSchema = z.object({
  summary: z.string().min(1),
  recommended_next_steps: z.array(z.string()).min(1).max(6),
})

export function fallbackReportSummary(situation: Situation, interactions: Interaction[]) {
  const breakdown = calculateCompatibilityBreakdown(situation, interactions)
  return {
    summary: `This situation is currently at ${breakdown.score}/100 compatibility with ${situation.emotional_invest}/10 emotional investment. The strongest signals are ${breakdown.notes.length ? breakdown.notes.join(' ') : 'limited because there is not much logged data yet.'}`,
    recommended_next_steps: [
      'Log the next meaningful interaction with sentiment.',
      'Review whether emotional investment matches consistent action.',
      situation.stage === 'no_contact' ? 'Protect the no-contact streak and avoid impulse replies.' : 'Choose one calm, direct next move instead of over-monitoring.',
    ],
  }
}
