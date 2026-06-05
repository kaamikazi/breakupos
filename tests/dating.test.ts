import { describe, expect, it } from 'vitest'
import {
  GENDER_VALUES,
  calculateProfileQuality,
  datingActionSchema,
  datingProfileSchema,
  datingReportSchema,
  getOrderedMatchPair,
  rankDiscoveryProfiles,
  splitInterests,
  splitPhotoUrls,
  validateProfilePhotoFile,
} from '@/lib/dating'
import { isAdminEmail, parseAdminEmails } from '@/lib/admin'

describe('dating domain', () => {
  it('validates a complete dating profile', () => {
    const parsed = datingProfileSchema.safeParse({
      display_name: 'Beta Tester',
      age: 29,
      bio: 'Warm, direct, and looking for clarity.',
      gender: 'female',
      interested_in: 'male',
      relationship_goal: 'long_term',
      interests: ['coffee', 'books'],
      city: 'Dhaka',
      visibility_status: 'visible',
      use_nickname: true,
      onboarding_completed: true,
      photo_urls: ['https://example.com/photo.jpg'],
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects underage profiles and invalid actions', () => {
    expect(datingProfileSchema.safeParse({
      display_name: 'Too Young',
      age: 17,
      gender: 'female',
      interested_in: 'male',
      relationship_goal: 'figuring_out',
    }).success).toBe(false)

    expect(datingActionSchema.safeParse({ target_user_id: 'not-a-uuid' }).success).toBe(false)
  })

  it('validates reports and normalizes helper input', () => {
    expect(GENDER_VALUES).toEqual(['female', 'male'])
    expect(datingProfileSchema.safeParse({
      display_name: 'Legacy Values',
      age: 28,
      gender: 'woman',
      interested_in: 'men',
      relationship_goal: 'figuring_out',
    }).success).toBe(true)
    expect(datingReportSchema.safeParse({
      target_user_id: '00000000-0000-4000-8000-000000000001',
      reason: 'underage_concern',
      details: 'Boundary violation',
    }).success).toBe(true)
    expect(splitInterests('coffee, books,  , music')).toEqual(['coffee', 'books', 'music'])
    expect(splitPhotoUrls('https://a.test/1.jpg\nhttps://a.test/2.jpg')).toHaveLength(2)
  })

  it('orders match pairs deterministically', () => {
    expect(getOrderedMatchPair('b-user', 'a-user')).toEqual(['a-user', 'b-user'])
  })

  it('validates profile photo files', () => {
    expect(validateProfilePhotoFile({ type: 'image/jpeg', size: 1024 }).valid).toBe(true)
    expect(validateProfilePhotoFile({ type: 'image/gif', size: 1024 }).valid).toBe(false)
    expect(validateProfilePhotoFile({ type: 'image/png', size: 6 * 1024 * 1024 }).valid).toBe(false)
  })

  it('scores profile quality and recommendations', () => {
    const weak = calculateProfileQuality({ bio: '', interests: [], relationship_goal: 'figuring_out', city: '', visibility_status: 'hidden', photos: [] })
    const strong = calculateProfileQuality({
      bio: 'I like direct communication, weekend coffee, live music, and steady plans.',
      interests: ['coffee', 'music', 'books', 'walking'],
      relationship_goal: 'long_term',
      city: 'Dhaka',
      visibility_status: 'visible',
      photos: [{}, {}, {}],
    })
    expect(weak.score).toBeLessThan(strong.score)
    expect(weak.recommendations.join(' ')).toContain('photo')
  })

  it('ranks discovery profiles by quality and shared signal', () => {
    const ranked = rankDiscoveryProfiles([
      { bio: '', interests: [], relationship_goal: 'figuring_out', city: '', visibility_status: 'visible', photos: [], updated_at: '2026-01-01' },
      { bio: 'Thoughtful and outdoorsy.', interests: ['coffee', 'books'], relationship_goal: 'long_term', city: 'Dhaka', visibility_status: 'visible', photos: [{}, {}], updated_at: new Date().toISOString() },
    ], { interests: ['coffee'], relationship_goal: 'long_term' })
    expect(ranked[0].city).toBe('Dhaka')
  })

  it('parses admin emails safely', () => {
    const admins = parseAdminEmails('Owner@Example.com, admin@example.com ')
    expect(isAdminEmail('owner@example.com', admins)).toBe(true)
    expect(isAdminEmail('user@example.com', admins)).toBe(false)
  })
})
