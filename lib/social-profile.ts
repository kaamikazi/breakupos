import { z } from 'zod'

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, underscores, and hyphens only.')

export const PUBLIC_VIBE_VALUES = ['healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'] as const

export const MESSAGE_REQUEST_STATUS_VALUES = ['pending', 'accepted', 'declined', 'blocked'] as const

export const messageRequestSchema = z.object({
  receiver_id: z.string().uuid(),
  source_post_id: z.string().uuid().nullable().optional(),
  message_text: z.string().trim().max(240).nullable().optional(),
})

export const messageRequestActionSchema = z.object({
  action: z.enum(['accept', 'decline', 'block']),
})

export function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, USERNAME_MAX_LENGTH)
}

export function fallbackUsername(input: {
  email?: string | null
  displayName?: string | null
  userId: string
}) {
  const seed =
    input.displayName ??
    (input.email?.includes('@') ? input.email.split('@')[0] : input.email) ??
    `user_${input.userId.slice(0, 8)}`
  const normalized = normalizeUsername(seed)
  if (normalized.length >= USERNAME_MIN_LENGTH) return normalized
  return `user_${input.userId.slice(0, 8)}`
}

export function publicProfilePath(profile: { username?: string | null; id: string }) {
  return profile.username ? `/u/${profile.username}` : null
}

export const PUBLIC_DISPLAY_NAME_FALLBACK = 'Breakup OS User'

export type PublicProfileSummaryInput = {
  id: string
  public_display_name?: string | null
  display_name?: string | null
  username?: string | null
  avatar_url?: string | null
  bio?: string | null
  public_bio?: string | null
  social_vibe?: string | null
  public_vibe?: string | null
  public_location?: string | null
  public_profile_visible?: boolean | null
}

export function getPublicDisplayName(profile: Pick<PublicProfileSummaryInput, 'public_display_name' | 'display_name' | 'username'>) {
  return profile.public_display_name?.trim() || profile.username?.trim() || profile.display_name?.trim() || PUBLIC_DISPLAY_NAME_FALLBACK
}

export function getPublicBio(profile: Pick<PublicProfileSummaryInput, 'bio' | 'public_bio'>) {
  return profile.bio?.trim() || profile.public_bio?.trim() || ''
}

export function getPublicVibe(profile: Pick<PublicProfileSummaryInput, 'social_vibe' | 'public_vibe'>) {
  return profile.social_vibe?.trim() || profile.public_vibe?.trim() || 'figuring_it_out'
}

export function toPublicProfileSummary(profile: PublicProfileSummaryInput) {
  return {
    id: profile.id,
    display_name: getPublicDisplayName(profile),
    public_display_name: profile.public_display_name ?? null,
    username: profile.username ?? null,
    avatar_url: profile.avatar_url ?? null,
    bio: getPublicBio(profile),
    social_vibe: getPublicVibe(profile),
    public_location: profile.public_location ?? null,
    public_profile_visible: profile.public_profile_visible ?? true,
    profile_path: publicProfilePath(profile),
  }
}

export function canSendMessageRequest(input: {
  senderId: string
  receiverId: string
  pendingExists: boolean
  blocked: boolean
}) {
  if (input.senderId === input.receiverId) {
    return { allowed: false, reason: 'You cannot send a request to yourself.' }
  }
  if (input.blocked) {
    return { allowed: false, reason: 'You cannot send a request to this user.' }
  }
  if (input.pendingExists) {
    return { allowed: false, reason: 'You already have a pending request with this person.' }
  }
  return { allowed: true, reason: null }
}

export function getCommunitySummary(loveCount: number, redFlagCount: number) {
  const total = loveCount + redFlagCount
  if (total === 0) return 'No community verdict yet'
  const lovePct = Math.round((loveCount / total) * 100)
  if (lovePct >= 70) return 'Mostly loved'
  if (lovePct <= 30) return 'Often red-flagged situations'
  return 'Mixed community verdict'
}

export function requestActionToStatus(action: 'accept' | 'decline' | 'block') {
  if (action === 'accept') return 'accepted'
  if (action === 'block') return 'blocked'
  return 'declined'
}
