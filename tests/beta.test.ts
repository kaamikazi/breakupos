import { afterEach, describe, expect, it } from 'vitest'
import { canAccessBetaApp, hasBetaPasswordConfigured, hasValidBetaAccessCode, isBetaAccessEnabled, isBetaApproved } from '@/lib/beta'
import { buildProfileDefaultsForUser } from '@/lib/quota'

const originalEnabled = process.env.BETA_ACCESS_ENABLED
const originalGateEnabled = process.env.BETA_GATE_ENABLED
const originalPublicGateEnabled = process.env.NEXT_PUBLIC_BETA_GATE_ENABLED
const originalCode = process.env.BETA_ACCESS_CODE

afterEach(() => {
  process.env.BETA_ACCESS_ENABLED = originalEnabled
  process.env.BETA_GATE_ENABLED = originalGateEnabled
  process.env.NEXT_PUBLIC_BETA_GATE_ENABLED = originalPublicGateEnabled
  process.env.BETA_ACCESS_CODE = originalCode
})

describe('beta access helpers', () => {
  it('detects enabled beta mode', () => {
    process.env.BETA_ACCESS_ENABLED = 'true'
    expect(isBetaAccessEnabled()).toBe(true)
    process.env.BETA_ACCESS_ENABLED = 'false'
    expect(isBetaAccessEnabled()).toBe(false)
    process.env.BETA_GATE_ENABLED = 'yes'
    expect(isBetaAccessEnabled()).toBe(true)
  })

  it('validates code server-side', () => {
    process.env.BETA_ACCESS_CODE = 'invite-123'
    expect(hasBetaPasswordConfigured()).toBe(true)
    expect(hasValidBetaAccessCode('invite-123')).toBe(true)
    expect(hasValidBetaAccessCode('wrong')).toBe(false)
  })

  it('allows approved profiles and blocks unapproved profiles when gate is on', () => {
    expect(isBetaApproved({ beta_approved_at: '2026-06-25T00:00:00.000Z' })).toBe(true)
    expect(isBetaApproved({ beta_approved_at: null })).toBe(false)
    expect(canAccessBetaApp({ gateEnabled: true, profile: { beta_approved_at: null } })).toBe(false)
    expect(canAccessBetaApp({ gateEnabled: true, profile: { beta_approved_at: '2026-06-25T00:00:00.000Z' } })).toBe(true)
    expect(canAccessBetaApp({ gateEnabled: false, profile: null })).toBe(true)
  })

  it('builds safe public defaults for new OAuth users', () => {
    const defaults = buildProfileDefaultsForUser({
      id: '12345678-aaaa-bbbb-cccc-123456789000',
      email: 'imran@example.com',
      user_metadata: { full_name: 'Imran Ahmed', avatar_url: 'https://cdn.test/avatar.jpg' },
    })

    expect(defaults.displayName).toBe('Imran Ahmed')
    expect(defaults.publicDisplayName).toBe('Imran Ahmed')
    expect(defaults.username).toMatch(/^imran_ahmed-123456$/)
    expect(defaults.avatarUrl).toBe('https://cdn.test/avatar.jpg')
    expect(defaults.publicDisplayName).not.toBe('imran@example.com')
  })
})
