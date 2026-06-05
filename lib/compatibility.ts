import type { CompatibilityBreakdown, Interaction, Situation } from '@/types'

type ScoredSituation = Pick<
  Situation,
  'red_flags' | 'green_flags' | 'emotional_invest'
> & {
  stage: string
  last_interaction?: string | null
}

type ScoredInteraction = Pick<Interaction, 'date'> & {
  type: string
  sentiment: string
}

const dayMs = 1000 * 60 * 60 * 24

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function daysBetween(a: string, b: string) {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / dayMs)
}

export function calculateCompatibilityBreakdown(
  situation: ScoredSituation,
  interactions: ScoredInteraction[]
): CompatibilityBreakdown {
  const notes: string[] = []
  const sorted = [...interactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const greenFlags = Math.min((situation.green_flags?.length ?? 0) * 5, 25)
  const redFlags = -Math.min((situation.red_flags?.length ?? 0) * 8, 40)
  const emotionalInvestment = Math.min((situation.emotional_invest ?? 5) * 2, 20)

  if (greenFlags > 0) notes.push(`${situation.green_flags.length} green flag(s) added signal.`)
  if (redFlags < 0) notes.push(`${situation.red_flags.length} red flag(s) pulled the score down.`)

  let sentimentTrend = 0
  if (sorted.length >= 3) {
    const recent = sorted.slice(-3)
    const sentimentScore = recent.reduce((sum, item) => {
      if (item.sentiment === 'positive') return sum + 1
      if (item.sentiment === 'negative') return sum - 1
      return sum
    }, 0)
    sentimentTrend = sentimentScore * 4
    if (sentimentTrend > 0) notes.push('Recent sentiment is improving.')
    if (sentimentTrend < 0) notes.push('Recent sentiment is sliding.')
  }

  let responseConsistency = 0
  if (sorted.length >= 3) {
    const gaps = sorted.slice(1).map((item, index) => daysBetween(sorted[index].date, item.date))
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    const variance = gaps.reduce((sum, gap) => sum + Math.abs(gap - avgGap), 0) / gaps.length
    responseConsistency = avgGap <= 3 && variance <= 2 ? 10 : avgGap > 7 ? -8 : 0
    if (responseConsistency > 0) notes.push('Interaction rhythm looks consistent.')
    if (responseConsistency < 0) notes.push('Long gaps suggest low consistency.')
  }

  const negativeSignals = sorted.filter(i =>
    i.type === 'ghost' || i.type === 'breadcrumb' || i.type === 'left_on_read'
  ).length
  const positiveSignals = sorted.filter(i => i.type === 'date' || i.type === 'call' || i.type === 'repair').length
  const emotionalImbalance =
    situation.emotional_invest >= 8 && negativeSignals > positiveSignals ? -12 :
    situation.emotional_invest <= 4 && positiveSignals > negativeSignals ? 6 :
    0
  if (emotionalImbalance < 0) notes.push('Your investment is high compared with their signal quality.')

  const lastGhost = [...sorted].reverse().find(i => i.type === 'ghost' || i.type === 'left_on_read')
  const ghostingDuration = lastGhost
    ? -Math.min(18, Math.floor((Date.now() - new Date(lastGhost.date).getTime()) / dayMs) * 2)
    : 0
  if (ghostingDuration < 0) notes.push('Recent ghosting or silence is still weighing on the score.')

  const conflicts = sorted.filter(i => i.type === 'conflict').length
  const repairs = sorted.filter(i => i.type === 'repair').length
  const conflictRecovery = conflicts === 0 ? 0 : repairs >= conflicts ? 8 : -10
  if (conflictRecovery > 0) notes.push('Conflicts appear to get repaired.')
  if (conflictRecovery < 0) notes.push('Conflict repair is missing or incomplete.')

  const last = sorted[sorted.length - 1]
  const daysSinceLast = last
    ? (Date.now() - new Date(last.date).getTime()) / dayMs
    : situation.last_interaction
      ? (Date.now() - new Date(situation.last_interaction).getTime()) / dayMs
      : null
  const recency = daysSinceLast === null ? 0 : daysSinceLast < 2 ? 10 : daysSinceLast > 10 ? -8 : 0

  const stage =
    situation.stage === 'red_flag_hold' ? -20 :
    situation.stage === 'ghosted' ? -18 :
    situation.stage === 'no_contact' ? -25 :
    situation.stage === 'dating' ? 10 :
    0

  const score = clampScore(
    50 +
    greenFlags +
    redFlags +
    emotionalInvestment +
    sentimentTrend +
    responseConsistency +
    emotionalImbalance +
    ghostingDuration +
    conflictRecovery +
    recency +
    stage
  )

  return {
    score,
    greenFlags,
    redFlags,
    emotionalInvestment,
    sentimentTrend,
    responseConsistency,
    emotionalImbalance,
    ghostingDuration,
    conflictRecovery,
    recency,
    stage,
    notes,
  }
}

export function calculateCompatibility(
  situation: ScoredSituation,
  interactions: ScoredInteraction[]
): number {
  return calculateCompatibilityBreakdown(situation, interactions).score
}

export function getCompatibilityLabel(score: number): string {
  if (score <= 30) return 'Run.'
  if (score <= 60) return 'Proceed with caution.'
  if (score <= 80) return 'Promising.'
  return 'Cuffing season candidate.'
}

export function getCompatibilityColor(score: number): string {
  if (score <= 30) return '#ef4444'
  if (score <= 60) return '#f59e0b'
  if (score <= 80) return '#14b8a6'
  return '#22c55e'
}
