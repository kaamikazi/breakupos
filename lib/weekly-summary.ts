import { z } from 'zod'
import type { Interaction, Situation } from '@/types'

export const summaryRequestSchema = z.object({
  week_start: z.string().optional(),
  week_end: z.string().optional(),
})

export const weeklyAiSchema = z.object({
  emotional_trend: z.string().min(1),
  biggest_red_flag: z.string().min(1),
  healthiest_connection: z.string().min(1),
  most_draining_situation: z.string().min(1),
  no_contact_progress: z.string().min(1),
  suggested_focus: z.string().min(1),
  summary: z.string().min(1),
})

export function fallbackWeeklySummary(situations: Situation[], interactions: Interaction[]) {
  const redFlagSituation = [...situations].sort((a, b) => (b.red_flags?.length ?? 0) - (a.red_flags?.length ?? 0))[0]
  const healthiest = [...situations].sort((a, b) => b.compatibility - a.compatibility)[0]
  const draining = [...situations].sort((a, b) =>
    (b.emotional_invest * 10 - b.compatibility) - (a.emotional_invest * 10 - a.compatibility)
  )[0]
  const positive = interactions.filter(i => i.sentiment === 'positive').length
  const negative = interactions.filter(i => i.sentiment === 'negative').length
  const noContact = situations.filter(s => s.stage === 'no_contact' || s.is_breakup_mode)

  return {
    emotional_trend: positive >= negative ? 'Stable to positive' : 'Heavy week with more negative signals than positive ones',
    biggest_red_flag: redFlagSituation?.red_flags?.[0] ?? 'No red flags logged this week',
    healthiest_connection: healthiest?.name ?? 'Not enough data yet',
    most_draining_situation: draining?.name ?? 'Not enough data yet',
    no_contact_progress: noContact.length ? `${noContact.length} no-contact situation(s) are being tracked.` : 'No active no-contact streaks.',
    suggested_focus: 'Log consistently, reduce impulsive checking, and choose one clear next action.',
    summary: `This week had ${interactions.length} logged interaction(s), with ${positive} positive and ${negative} negative signal(s).`,
  }
}
