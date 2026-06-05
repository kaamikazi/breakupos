import { describe, expect, it } from 'vitest'
import { filterAdminReports, getVerificationBadge, onboardingStepSchema } from '@/lib/dating-beta'
import { getMessageSpamVerdict, isInactiveMatch } from '@/lib/dating-chat'
import { buildNotification, markNotificationRead } from '@/lib/notifications'

describe('dating beta readiness helpers', () => {
  it('validates onboarding steps', () => {
    expect(onboardingStepSchema.safeParse({ step: 1 }).success).toBe(true)
    expect(onboardingStepSchema.safeParse({ step: 6 }).success).toBe(false)
  })

  it('maps verification status to trust badges', () => {
    expect(getVerificationBadge('verified')).toEqual({ label: 'Verified', tone: 'success' })
    expect(getVerificationBadge('pending').label).toContain('pending')
    expect(getVerificationBadge('unknown').label).toBe('Unverified')
  })

  it('detects obvious message spam', () => {
    expect(getMessageSpamVerdict('x', [], 'user-1').allowed).toBe(false)
    expect(getMessageSpamVerdict('Are you free for coffee this weekend?', [], 'user-1').allowed).toBe(true)
    expect(getMessageSpamVerdict('Same message', [{ body: 'Same message', sender_id: 'user-1', created_at: new Date().toISOString() }], 'user-1').allowed).toBe(false)
  })

  it('detects inactive matches without deleting them', () => {
    expect(isInactiveMatch('2026-01-01T00:00:00.000Z', new Date('2026-02-01T00:00:00.000Z'))).toBe(true)
    expect(isInactiveMatch('2026-01-30T00:00:00.000Z', new Date('2026-02-01T00:00:00.000Z'))).toBe(false)
  })

  it('builds and marks notifications read', () => {
    const notification = buildNotification({
      user_id: 'user-1',
      type: 'new_message',
      title: 'New message',
      body: 'A match sent a message.',
      link_url: '/matches/1',
    })
    expect(notification.type).toBe('new_message')
    const read = markNotificationRead({ id: 'n1', read_at: null as string | null }, new Date('2026-06-02T00:00:00.000Z'))
    expect(read.read_at).toBe('2026-06-02T00:00:00.000Z')
  })

  it('filters admin reports by status and category', () => {
    const reports = [
      { status: 'open', reason: 'harassment' },
      { status: 'reviewed', reason: 'spam' },
    ]
    expect(filterAdminReports(reports, { status: 'open' })).toHaveLength(1)
    expect(filterAdminReports(reports, { reason: 'spam' })[0].status).toBe('reviewed')
  })
})
