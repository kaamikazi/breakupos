import { describe, expect, it } from 'vitest'
import {
  canSendMessageRequest,
  fallbackUsername,
  getCommunitySummary,
  messageRequestActionSchema,
  messageRequestSchema,
  publicProfilePath,
  requestActionToStatus,
  usernameSchema,
} from '@/lib/social-profile'

describe('public social profiles', () => {
  it('validates safe usernames', () => {
    expect(usernameSchema.safeParse('alex_123').success).toBe(true)
    expect(usernameSchema.safeParse('Alex 123').success).toBe(false)
    expect(usernameSchema.safeParse('ab').success).toBe(false)
  })

  it('creates a safe fallback username without exposing email', () => {
    expect(fallbackUsername({ email: 'Test.User@example.com', userId: '1234567890' })).toBe('test_user')
    expect(fallbackUsername({ userId: 'abcdef123456' })).toBe('user_abcdef12')
  })

  it('uses username first for profile paths', () => {
    expect(publicProfilePath({ username: 'sam', id: 'user-id' })).toBe('/u/sam')
    expect(publicProfilePath({ username: null, id: 'user-id' })).toBe('/u/user-id')
  })

  it('summarizes public verdicts without private data', () => {
    expect(getCommunitySummary(0, 0)).toBe('No community verdict yet')
    expect(getCommunitySummary(9, 1)).toBe('Mostly loved')
    expect(getCommunitySummary(2, 8)).toBe('Often red-flagged situations')
    expect(getCommunitySummary(5, 5)).toBe('Mixed community verdict')
  })
})

describe('message request rules', () => {
  it('rejects self requests, duplicates, and blocked users', () => {
    expect(canSendMessageRequest({ senderId: 'a', receiverId: 'a', pendingExists: false, blocked: false }).allowed).toBe(false)
    expect(canSendMessageRequest({ senderId: 'a', receiverId: 'b', pendingExists: true, blocked: false }).allowed).toBe(false)
    expect(canSendMessageRequest({ senderId: 'a', receiverId: 'b', pendingExists: false, blocked: true }).allowed).toBe(false)
    expect(canSendMessageRequest({ senderId: 'a', receiverId: 'b', pendingExists: false, blocked: false }).allowed).toBe(true)
  })

  it('validates request inputs and actions', () => {
    expect(messageRequestSchema.safeParse({ receiver_id: 'not-a-uuid' }).success).toBe(false)
    expect(messageRequestActionSchema.safeParse({ action: 'accept' }).success).toBe(true)
    expect(messageRequestActionSchema.safeParse({ action: 'ignore' }).success).toBe(false)
    expect(requestActionToStatus('accept')).toBe('accepted')
    expect(requestActionToStatus('decline')).toBe('declined')
    expect(requestActionToStatus('block')).toBe('blocked')
  })
})
