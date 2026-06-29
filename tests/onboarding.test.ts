import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildProfileOnboardingUpdate,
  canUseUsername,
  getFirstGoalRedirect,
  getOnboardingSaveError,
  isProfileOnboarded,
  profileOnboardingSchema,
  suggestOnboardingUsername,
} from '@/lib/onboarding'
import { getPublicDisplayName } from '@/lib/social-profile'

const repoRoot = process.cwd()

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

  it('builds the profile update with completion timestamp and consistent field names', () => {
    const completedAt = '2026-06-29T00:00:00.000Z'
    const parsed = profileOnboardingSchema.parse({
      public_display_name: ' kamikaze ',
      username: 'kamikaze',
      avatar_url: '',
      bio: ' here to decode the chaos ',
      onboarding_reasons: ['ghosted', 'red_flags'],
      first_goal: 'decode_message',
    })

    expect(buildProfileOnboardingUpdate(parsed, completedAt)).toEqual({
      public_display_name: 'kamikaze',
      display_name: 'kamikaze',
      username: 'kamikaze',
      avatar_url: null,
      bio: 'here to decode the chaos',
      onboarding_reasons: ['ghosted', 'red_flags'],
      first_goal: 'decode_message',
      public_profile_visible: true,
      profile_completed_at: completedAt,
    })
  })

  it('returns launch-useful onboarding save errors', () => {
    expect(getOnboardingSaveError({ code: '23505', message: 'duplicate key value violates unique constraint' })).toEqual({
      status: 409,
      message: 'Username is already taken',
    })
    expect(getOnboardingSaveError({ code: '42703', message: 'column "onboarding_reasons" does not exist' }).message).toContain('migration')
    expect(getOnboardingSaveError({ code: '42501', message: 'violates row-level security policy' }).status).toBe(403)
  })

  it('ships a self-contained migration for profile fields, uniqueness, and own-profile RLS', () => {
    const migration = readFileSync(join(repoRoot, 'supabase/profile-onboarding.sql'), 'utf8')

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS public_display_name TEXT')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS username TEXT')
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS onboarding_reasons TEXT[] DEFAULT '{}'")
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS first_goal TEXT')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ')
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS profiles_username_format_check')
    expect(migration).toContain('DROP INDEX IF EXISTS public.idx_profiles_username_lower_unique')
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique')
    expect(migration).toContain("CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,20}$')")
    expect(migration).toContain('USING (auth.uid() = id)')
    expect(migration).toContain('WITH CHECK (auth.uid() = id)')
  })

  it('renders profile-load fallback instead of redirecting signed-in users back to login', () => {
    const page = readFileSync(join(repoRoot, 'app/onboarding/page.tsx'), 'utf8')
    const loading = readFileSync(join(repoRoot, 'app/onboarding/loading.tsx'), 'utf8')

    expect(page).toContain('Could not load your profile.')
    expect(page).toContain('<ProfileLoadError />')
    expect(page).not.toContain("if (!profile) redirect('/login?next=/onboarding')")
    expect(loading).toContain('Loading Breakup OS...')
  })

  it('does not run client navigation in an effect loop', () => {
    const client = readFileSync(join(repoRoot, 'components/Onboarding/ProfileOnboardingClient.tsx'), 'utf8')

    expect(client).not.toContain('useEffect')
    expect(client).not.toContain('router.replace')
    expect(client.match(/router\.push/g)?.length ?? 0).toBe(1)
  })
})
