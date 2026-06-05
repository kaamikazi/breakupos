import { afterEach, describe, expect, it } from 'vitest'
import { hasValidBetaAccessCode, isBetaAccessEnabled } from '@/lib/beta'

const originalEnabled = process.env.BETA_ACCESS_ENABLED
const originalCode = process.env.BETA_ACCESS_CODE

afterEach(() => {
  process.env.BETA_ACCESS_ENABLED = originalEnabled
  process.env.BETA_ACCESS_CODE = originalCode
})

describe('beta access helpers', () => {
  it('detects enabled beta mode', () => {
    process.env.BETA_ACCESS_ENABLED = 'true'
    expect(isBetaAccessEnabled()).toBe(true)
    process.env.BETA_ACCESS_ENABLED = 'false'
    expect(isBetaAccessEnabled()).toBe(false)
  })

  it('validates code server-side', () => {
    process.env.BETA_ACCESS_CODE = 'invite-123'
    expect(hasValidBetaAccessCode('invite-123')).toBe(true)
    expect(hasValidBetaAccessCode('wrong')).toBe(false)
  })
})
