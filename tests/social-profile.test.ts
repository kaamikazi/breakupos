import { describe, expect, it } from 'vitest'
import {
  canSendMessageRequest,
  fallbackUsername,
  getCommunitySummary,
  getPublicDisplayName,
  messageRequestActionSchema,
  messageRequestSchema,
  publicProfilePath,
  requestActionToStatus,
  toPublicProfileSummary,
  usernameSchema,
} from '@/lib/social-profile'

describe('public social profiles', () => {
  it('validates safe usernames', () => {
    expect(usernameSchema.safeParse('alex_123').success).toBe(true)
    expect(usernameSchema.safeParse('alex-123').success).toBe(true)
    expect(usernameSchema.safeParse('Alex 123').success).toBe(false)
    expect(usernameSchema.safeParse('ab').success).toBe(false)
  })

  it('creates a safe fallback username without exposing email', () => {
    expect(fallbackUsername({ email: 'Test.User@example.com', userId: '1234567890' })).toBe('test_user')
    expect(fallbackUsername({ userId: 'abcdef123456' })).toBe('user_abcdef12')
  })

  it('uses /u/[username] when username exists', () => {
    expect(publicProfilePath({ username: 'sam', id: 'user-id' })).toBe('/u/sam')
  })

  it('does not create a public profile link when username is missing', () => {
    expect(publicProfilePath({ username: null, id: 'user-id' })).toBeNull()
  })

  it('renders social feed profile labels when username exists', () => {
    const summary = toPublicProfileSummary({
      id: 'user-id',
      display_name: 'Sam',
      username: 'sam',
      avatar_url: null,
      bio: 'Public bio',
      public_profile_visible: true,
    })

    expect(summary.display_name).toBe('Sam')
    expect(summary.profile_path).toBe('/u/sam')
    expect(summary.bio).toBe('Public bio')
  })

  it('renders social feed profile labels when username is null', () => {
    const summary = toPublicProfileSummary({
      id: 'user-id',
      display_name: null,
      username: null,
      avatar_url: null,
      public_bio: null,
      public_profile_visible: true,
    })

    expect(summary.display_name).toBe('Breakup OS User')
    expect(summary.profile_path).toBeNull()
  })

  it('uses a safe display fallback without exposing email or ids', () => {
    expect(getPublicDisplayName({ display_name: null, username: null })).toBe('Breakup OS User')
  })

  it('summarizes public verdicts without private data', () => {
    expect(getCommunitySummary(0, 0)).toBe('No community verdict yet')
    expect(getCommunitySummary(9, 1)).toBe('Mostly loved')
    expect(getCommunitySummary(2, 8)).toBe('Often red-flagged situations')
    expect(getCommunitySummary(5, 5)).toBe('Mixed community verdict')
  })

  it('public profile summaries hide private Breakup OS and situationship data', () => {
    const unsafeProfile = {
      id: 'user-id',
      display_name: 'Public Sam',
      username: 'public-sam',
      avatar_url: null,
      bio: 'Visible',
      public_profile_visible: true,
      private_vault: 'secret',
      situations_count: 9,
    } as Parameters<typeof toPublicProfileSummary>[0]
    const profile = toPublicProfileSummary(unsafeProfile)

    expect(profile).toEqual({
      id: 'user-id',
      display_name: 'Public Sam',
      username: 'public-sam',
      avatar_url: null,
      bio: 'Visible',
      social_vibe: 'figuring_it_out',
      public_location: null,
      public_profile_visible: true,
      profile_path: '/u/public-sam',
    })
    expect('private_vault' in profile).toBe(false)
    expect('situations_count' in profile).toBe(false)
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
