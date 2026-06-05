import { describe, expect, it } from 'vitest'
import { fallbackWeeklySummary, summaryRequestSchema, weeklyAiSchema } from '@/lib/weekly-summary'
import { baseInteractions, baseSituation } from './fixtures'

describe('weekly summary helpers', () => {
  it('validates optional date request', () => {
    expect(summaryRequestSchema.safeParse({}).success).toBe(true)
    expect(summaryRequestSchema.safeParse({ week_start: '2026-05-01', week_end: '2026-05-07' }).success).toBe(true)
  })

  it('creates a valid fallback weekly summary', () => {
    const summary = fallbackWeeklySummary([baseSituation], baseInteractions)

    expect(summary.healthiest_connection).toBe(baseSituation.name)
    expect(weeklyAiSchema.safeParse(summary).success).toBe(true)
  })
})
