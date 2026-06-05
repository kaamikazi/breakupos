import { describe, expect, it } from 'vitest'
import {
  advancedDiscoveryFilterSchema,
  analyzeDatingChat,
  applyAdvancedFilters,
  canExposeWhoLikedYou,
  getCompatibilityPreview,
  getDailyLikeStatus,
  getIcebreakerFallback,
  shouldNotifyNewMatch,
} from '@/lib/dating-premium'
import type { DatingMessage, DatingProfileWithPhotos, ProfileLike } from '@/types'

const baseProfile: DatingProfileWithPhotos = {
  user_id: 'user-1',
  display_name: 'Alex',
  age: 29,
  bio: 'I like coffee, music, and steady communication.',
  gender: 'female',
  interested_in: 'male',
  relationship_goal: 'long_term',
  interests: ['coffee', 'music'],
  city: 'Dhaka',
  visibility_status: 'visible',
  verification_status: 'unverified',
  use_nickname: true,
  onboarding_completed: true,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: new Date().toISOString(),
  photos: [{ id: 'p1', user_id: 'user-1', photo_url: 'https://x.test/a.jpg', storage_path: null, source: 'url', mime_type: null, size_bytes: null, position: 0, is_primary: true, created_at: '2026-06-01T00:00:00.000Z' }],
}

describe('dating premium helpers', () => {
  it('enforces daily like limits by plan', () => {
    expect(getDailyLikeStatus({ plan: 'free', likesToday: 19 })).toEqual({ limit: 20, remaining: 1, canLike: true })
    expect(getDailyLikeStatus({ plan: 'free', likesToday: 20 }).canLike).toBe(false)
    expect(getDailyLikeStatus({ plan: 'pro', likesToday: 500 }).limit).toBeNull()
  })

  it('validates advanced filters', () => {
    expect(advancedDiscoveryFilterSchema.safeParse({ min_age: '25', max_age: '30', min_quality: '60' }).success).toBe(true)
    expect(advancedDiscoveryFilterSchema.safeParse({ min_age: '40', max_age: '30' }).success).toBe(false)
  })

  it('filters discovery profiles', () => {
    const results = applyAdvancedFilters([
      baseProfile,
      { ...baseProfile, user_id: 'user-2', age: 45, city: 'Chittagong', interests: ['sports'] },
    ], { min_age: 25, max_age: 35, city: 'Dhaka', shared_interests: true, recently_active: false }, { interests: ['coffee'] })
    expect(results).toHaveLength(1)
    expect(results[0].user_id).toBe('user-1')
  })

  it('creates a compatibility preview without scientific claims', () => {
    const preview = getCompatibilityPreview(baseProfile, { interests: ['coffee'], relationship_goal: 'long_term' })
    expect(['moderate', 'strong']).toContain(preview.label)
    expect(preview.reason).toContain('shared interest')
  })

  it('creates safe icebreaker fallback', () => {
    expect(getIcebreakerFallback(baseProfile, 'playful')).toContain('coffee')
    expect(getIcebreakerFallback(baseProfile, 'direct')).not.toMatch(/sex|pressure/i)
  })

  it('analyzes recent dating chat with fallback logic', () => {
    const messages: DatingMessage[] = [{
      id: 'm1',
      match_id: 'match-1',
      sender_id: 'user-2',
      body: 'I miss you but I am busy maybe later',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
      deleted_at: null,
      read_at: null,
    }]
    const result = analyzeDatingChat(messages)
    expect(result.consistency).toContain('inconsistent')
    expect(result.mixedSignals.length).toBeGreaterThan(0)
  })

  it('protects who-liked-you privacy for free users and blocked users', () => {
    const like: ProfileLike = { id: 'l1', liker_user_id: 'user-2', liked_user_id: 'user-1', created_at: '2026-06-01T00:00:00.000Z' }
    expect(canExposeWhoLikedYou({ isPro: false, liker: like, blockedUserIds: new Set() })).toBe(false)
    expect(canExposeWhoLikedYou({ isPro: true, liker: like, blockedUserIds: new Set(['user-2']) })).toBe(false)
    expect(canExposeWhoLikedYou({ isPro: true, liker: like, blockedUserIds: new Set() })).toBe(true)
  })

  it('only notifies for newly created matches', () => {
    expect(shouldNotifyNewMatch(null)).toBe(true)
    expect(shouldNotifyNewMatch({ id: 'existing-match' })).toBe(false)
  })
})
