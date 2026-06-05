import { z } from 'zod'

export const DATING_FIELD_LIMITS = {
  displayName: 80,
  bio: 500,
  city: 80,
  interest: 40,
  reportDetails: 500,
  photoUrl: 500,
} as const

export const PROFILE_PHOTO_BUCKET = 'profile-photos'
export const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024
export const PROFILE_PHOTO_MAX_COUNT = 6
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const GENDER_VALUES = ['female', 'male'] as const
export const INTERESTED_IN_VALUES = ['female', 'male'] as const
export const RELATIONSHIP_GOAL_VALUES = ['long_term', 'short_term', 'friendship', 'figuring_out'] as const
export const VISIBILITY_VALUES = ['visible', 'hidden'] as const
export const VERIFICATION_STATUS_VALUES = ['unverified', 'pending', 'verified', 'rejected'] as const
export const REPORT_REASON_VALUES = [
  'harassment',
  'scam',
  'explicit_content',
  'spam',
  'fake_profile',
  'underage_concern',
  'other',
] as const
export const REPORT_STATUS_VALUES = ['open', 'reviewed', 'dismissed', 'actioned'] as const

export const DATING_LABELS = {
  gender: {
    female: 'Female',
    male: 'Male',
  },
  interestedIn: {
    female: 'Female',
    male: 'Male',
  },
  relationshipGoal: {
    long_term: 'Long-term',
    short_term: 'Short-term',
    friendship: 'Friendship',
    figuring_out: 'Figuring it out',
  },
  visibility: {
    visible: 'Visible',
    hidden: 'Hidden',
  },
  verification: {
    unverified: 'Unverified',
    pending: 'Pending verification',
    verified: 'Verified',
    rejected: 'Verification rejected',
  },
  reportReason: {
    harassment: 'Harassment',
    scam: 'Scam',
    explicit_content: 'Explicit content',
    spam: 'Spam',
    fake_profile: 'Fake profile',
    underage_concern: 'Underage concern',
    other: 'Other',
  },
  reportStatus: {
    open: 'Open',
    reviewed: 'Reviewed',
    dismissed: 'Dismissed',
    actioned: 'Actioned',
  },
} as const

const cleanedString = (max: number) => z.string().trim().max(max)

export function getOppositeDatingGender(gender: string) {
  return gender === 'male' ? 'female' : 'male'
}

function normalizeDatingGender(value: unknown) {
  if (value === 'woman' || value === 'women' || value === 'female') return 'female'
  if (value === 'man' || value === 'men' || value === 'male') return 'male'
  return value
}

export const datingProfileSchema = z.object({
  display_name: cleanedString(DATING_FIELD_LIMITS.displayName).min(1),
  age: z.number().int().min(18).max(99),
  bio: cleanedString(DATING_FIELD_LIMITS.bio).default(''),
  gender: z.preprocess(normalizeDatingGender, z.enum(GENDER_VALUES)),
  interested_in: z.preprocess(normalizeDatingGender, z.enum(INTERESTED_IN_VALUES)),
  relationship_goal: z.enum(RELATIONSHIP_GOAL_VALUES),
  interests: z
    .array(cleanedString(DATING_FIELD_LIMITS.interest).min(1))
    .max(12)
    .default([]),
  city: cleanedString(DATING_FIELD_LIMITS.city).default(''),
  visibility_status: z.enum(VISIBILITY_VALUES).default('visible'),
  verification_status: z.enum(VERIFICATION_STATUS_VALUES).optional().default('unverified'),
  use_nickname: z.boolean().default(true),
  onboarding_completed: z.boolean().default(true),
  photo_urls: z
    .array(cleanedString(DATING_FIELD_LIMITS.photoUrl).url())
    .max(PROFILE_PHOTO_MAX_COUNT)
    .default([]),
})

export const datingActionSchema = z.object({
  target_user_id: z.string().uuid(),
})

export const verificationRequestSchema = z.object({
  request_note: z.string().trim().max(500).optional().default(''),
})

export const datingReportSchema = datingActionSchema.extend({
  reason: z.enum(REPORT_REASON_VALUES),
  details: cleanedString(DATING_FIELD_LIMITS.reportDetails).optional().default(''),
})

export const adminReportStatusSchema = z.object({
  status: z.enum(REPORT_STATUS_VALUES),
  internal_notes: cleanedString(1000).optional().default(''),
  block_reported_user: z.boolean().optional().default(false),
})

export function validateProfilePhotoFile(file: Pick<File, 'type' | 'size'>) {
  if (!PROFILE_PHOTO_TYPES.includes(file.type as (typeof PROFILE_PHOTO_TYPES)[number])) {
    return { valid: false, error: 'Use a JPG, PNG, or WebP image.' }
  }
  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    return { valid: false, error: 'Profile photos must be 5MB or smaller.' }
  }
  return { valid: true, error: null }
}

export type DatingProfileInput = z.infer<typeof datingProfileSchema>

export function splitInterests(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export function splitPhotoUrls(value: string) {
  return value
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

export type QualityProfile = {
  bio?: string | null
  interests?: string[] | null
  relationship_goal?: string | null
  city?: string | null
  visibility_status?: string | null
  photos?: unknown[] | null
}

export function calculateProfileQuality(profile: QualityProfile) {
  const recommendations: string[] = []
  const photoCount = profile.photos?.length ?? 0
  let score = 0

  score += Math.min(photoCount, 3) * 15
  if (photoCount === 0) recommendations.push('Add at least one clear profile photo to become visible in discovery.')
  if (photoCount < 3) recommendations.push('Add a few more photos for a stronger profile.')

  const bioLength = profile.bio?.trim().length ?? 0
  if (bioLength >= 120) score += 20
  else if (bioLength >= 40) score += 12
  else recommendations.push('Write a short bio with what you enjoy and what you are looking for.')

  const interestCount = profile.interests?.filter(Boolean).length ?? 0
  score += Math.min(interestCount, 4) * 5
  if (interestCount < 3) recommendations.push('Add at least three interests to improve matching signal.')

  if (profile.relationship_goal && profile.relationship_goal !== 'figuring_out') score += 10
  else recommendations.push('Choose a clearer relationship goal if you know it.')

  if (profile.city?.trim()) score += 5
  else recommendations.push('Add a city or region if you are comfortable sharing it.')

  if (profile.visibility_status === 'visible') score += 10
  else recommendations.push('Turn visibility on when you are ready to appear in discovery.')

  return { score: Math.max(0, Math.min(100, score)), recommendations }
}

export function rankDiscoveryProfiles<T extends QualityProfile & { updated_at?: string; relationship_goal?: string | null; interests?: string[] | null }>(
  profiles: T[],
  currentProfile?: QualityProfile | null
) {
  const currentInterests = new Set(currentProfile?.interests ?? [])
  const currentGoal = currentProfile?.relationship_goal

  return [...profiles].sort((a, b) => {
    const scoreFor = (profile: T) => {
      const quality = calculateProfileQuality(profile).score
      const sharedInterests = (profile.interests ?? []).filter(interest => currentInterests.has(interest)).length
      const goalMatch = currentGoal && profile.relationship_goal === currentGoal ? 10 : 0
      const recency = profile.updated_at
        ? Math.max(0, 10 - Math.floor((Date.now() - new Date(profile.updated_at).getTime()) / 86400000))
        : 0
      return quality + sharedInterests * 8 + goalMatch + recency
    }
    return scoreFor(b) - scoreFor(a)
  })
}

export function getOrderedMatchPair(userA: string, userB: string) {
  return [userA, userB].sort() as [string, string]
}
