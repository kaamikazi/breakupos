import { z } from 'zod'
import { normalizeUsername } from '@/lib/social-profile'

export const ONBOARDING_REASONS = [
  'breakup_recovery',
  'ghosted',
  'talking_stage',
  'no_contact',
  'red_flags',
  'dating',
  'exploring',
] as const

export type OnboardingReason = (typeof ONBOARDING_REASONS)[number]

export const ONBOARDING_REASON_LABELS: Record<OnboardingReason, string> = {
  breakup_recovery: 'Breakup recovery',
  ghosted: 'Ghosted',
  talking_stage: 'Talking stage',
  no_contact: 'No contact',
  red_flags: 'Red flags',
  dating: 'Dating / meeting people',
  exploring: 'Just exploring',
}

export const FIRST_GOALS = [
  'decode_message',
  'track_situation',
  'browse_social',
  'post_photo',
  'find_people',
] as const

export type FirstGoal = (typeof FIRST_GOALS)[number]

export const FIRST_GOAL_LABELS: Record<FirstGoal, string> = {
  decode_message: 'Decode a message with AI',
  track_situation: 'Track a situation privately',
  browse_social: 'Browse the social feed',
  post_photo: 'Post a photo',
  find_people: 'Find people / message requests',
}

export const onboardingUsernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(20, 'Username must be 20 characters or fewer.')
  .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, underscores, and hyphens only.')

export const profileOnboardingSchema = z.object({
  public_display_name: z.string().trim().min(1, 'Public name is required.').max(60),
  username: onboardingUsernameSchema,
  avatar_url: z.string().trim().url().max(500).optional().or(z.literal('')),
  bio: z.string().trim().max(300).optional().default(''),
  onboarding_reasons: z.array(z.enum(ONBOARDING_REASONS)).min(1, 'Choose at least one reason.').max(4),
  first_goal: z.enum(FIRST_GOALS),
})

export type ProfileOnboardingInput = z.infer<typeof profileOnboardingSchema>

export function isProfileOnboarded(profile: {
  public_display_name?: string | null
  username?: string | null
  profile_completed_at?: string | null
} | null | undefined) {
  return Boolean(
    profile?.public_display_name?.trim() &&
    profile?.username?.trim() &&
    profile?.profile_completed_at
  )
}

export function suggestOnboardingUsername(input: {
  displayName?: string | null
  username?: string | null
  userId: string
}) {
  const existing = normalizeUsername(input.username ?? '')
  if (existing.length >= 3 && existing.length <= 20) return existing

  const seed = normalizeUsername(input.displayName ?? '')
  if (seed.length >= 3 && seed.length <= 20) return seed

  const base = seed.length >= 3 ? seed : 'user'
  const suffix = input.userId.slice(0, 5).toLowerCase()
  return `${base.slice(0, Math.max(3, 19 - suffix.length))}-${suffix}`.slice(0, 20)
}

export function canUseUsername(usernameOwnerId: string | null | undefined, currentUserId: string) {
  return !usernameOwnerId || usernameOwnerId === currentUserId
}

export function getFirstGoalRedirect(goal: FirstGoal) {
  const redirects: Record<FirstGoal, string> = {
    decode_message: '/analyzer',
    track_situation: '/dashboard',
    browse_social: '/social',
    post_photo: '/social?create=post',
    find_people: '/requests',
  }
  return redirects[goal]
}
