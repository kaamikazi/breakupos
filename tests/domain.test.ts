import { describe, expect, it } from 'vitest'
import { ADVICE_TYPE_VALUES, FIELD_LIMITS, INTERACTION_TYPE_VALUES, STAGE_VALUES } from '@/lib/domain'

describe('domain constants', () => {
  it('contains monetized feature types and recovery stage', () => {
    expect(STAGE_VALUES).toContain('no_contact')
    expect(INTERACTION_TYPE_VALUES).toContain('relapse')
    expect(ADVICE_TYPE_VALUES).toContain('message_analysis')
  })

  it('keeps key field limits bounded', () => {
    expect(FIELD_LIMITS.messageText).toBeLessThanOrEqual(8000)
    expect(FIELD_LIMITS.privateVault).toBeGreaterThan(FIELD_LIMITS.privateNotes)
  })
})
