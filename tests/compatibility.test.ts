import { describe, expect, it } from 'vitest'
import { calculateCompatibilityBreakdown, getCompatibilityLabel } from '@/lib/compatibility'
import { baseInteractions, baseSituation } from './fixtures'

describe('compatibility scoring', () => {
  it('returns a clamped score and breakdown notes', () => {
    const breakdown = calculateCompatibilityBreakdown(baseSituation, baseInteractions)

    expect(breakdown.score).toBeGreaterThanOrEqual(0)
    expect(breakdown.score).toBeLessThanOrEqual(100)
    expect(breakdown.redFlags).toBeLessThan(0)
    expect(breakdown.notes.length).toBeGreaterThan(0)
  })

  it('penalizes no-contact stage heavily', () => {
    const normal = calculateCompatibilityBreakdown(baseSituation, baseInteractions)
    const noContact = calculateCompatibilityBreakdown({ ...baseSituation, stage: 'no_contact' }, baseInteractions)

    expect(noContact.score).toBeLessThan(normal.score)
  })

  it('labels low scores clearly', () => {
    expect(getCompatibilityLabel(20)).toBe('Run.')
  })
})
