import { describe, expect, it } from 'vitest'
import {
  canUseUsername,
  getFirstGoalRedirect,
  isProfileOnboarded,
  profileOnboardingSchema,
  suggestOnboardingUsername,
} from '@/lib/onboarding'
import { getPublicDisplayName } from '@/lib/social-profile'

describe('first-time profile onboarding', () => {
  it('requires a public name, username, reason, and first action', () => {
    const valid = {
      public_display_name: 'kamikaze',
      username: 'kamikaze',
      avatar_url: '',
      bio: 'healing, but make it honest',
      onboarding_reasons: ['talking_stage'],
      first_goal: 'browse_social',
    }

    expect(profileOnboardingSchema.safeParse(valid).success).toBe(true)
    expect(profileOnboardingSchema.safeParse({ ...valid, public_display_name: '' }).success).toBe(false)
    expect(profileOnboardingSchema.safeParse({ ...valid, username: '' }).success).toBe(false)
    expect(profileOnboardingSchema.safeParse({ ...valid, onboarding_reasons: [] }).success).toBe(false)
  })

  it('validates username length and characters', () => {
    const base = {
      public_display_name: 'Launch Tester',
      avatar_url: '',
      bio: '',
      onboarding_reasons: ['exploring'],
      first_goal: 'decode_message',
    }

    expect(profileOnboardingSchema.safeParse({ ...base, username: 'ab' }).success).toBe(false)
    expect(profileOnboardingSchema.safeParse({ ...base, username: 'AName' }).success).toBe(false)
    expect(profileOnboardingSchema.safeParse({ ...base, username: 'name with spaces' }).success).toBe(false)
    expect(profileOnboardingSchema.safeParse({ ...base, username: 'a'.repeat(21) }).success).toBe(false)
    expect(profileOnboardingSchema.safeParse({ ...base, username: 'name_123-ok' }).success).toBe(true)
  })

  it('knows when a profile is fully onboarded', () => {
    expect(isProfileOnboarded(null)).toBe(false)
    expect(isProfileOnboarded({ public_display_name: 'A', username: 'a' })).toBe(false)
    expect(isProfileOnboarded({ public_display_name: '', username: 'a', profile_completed_at: '2026-06-29T00:00:00Z' })).toBe(false)
    expect(isProfileOnboarded({ public_display_name: 'A', username: 'a', profile_completed_at: '2026-06-29T00:00:00Z' })).toBe(true)
  })

  it('generates editable username suggestions without exposing email', () => {
    expect(suggestOnboardingUsername({
      displayName: 'Imran Ahmed',
      userId: '1234567890abcdef',
    })).toBe('imran_ahmed')

    expect(suggestOnboardingUsername({
      displayName: '',
      userId: '1234567890abcdef',
    })).toBe('user-12345')
  })

  it('enforces username ownership rules', () => {
    expect(canUseUsername(null, 'user-a')).toBe(true)
    expect(canUseUsername('user-a', 'user-a')).toBe(true)
    expect(canUseUsername('user-b', 'user-a')).toBe(false)
  })

  it('redirects first actions to the right app surfaces', () => {
    expect(getFirstGoalRedirect('decode_message')).toBe('/analyzer')
    expect(getFirstGoalRedirect('track_situation')).toBe('/dashboard')
    expect(getFirstGoalRedirect('browse_social')).toBe('/social')
    expect(getFirstGoalRedirect('post_photo')).toBe('/social?create=post')
    expect(getFirstGoalRedirect('find_people')).toBe('/requests')
  })

  it('public identity never needs an email fallback', () => {
    expect(getPublicDisplayName({
      public_display_name: null,
      username: null,
      display_name: null,
    })).toBe('Breakup OS User')
  })
})
