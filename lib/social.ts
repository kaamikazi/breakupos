import { z } from 'zod'

// --- Social feed domain: photo-only posts, Love vs Red Flag verdicts ---

export const SOCIAL_POST_BUCKET = 'social-posts'
export const SOCIAL_PHOTO_MAX_SIZE = 5 * 1024 * 1024
export const SOCIAL_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const SOCIAL_FEED_PAGE_SIZE = 20
export const DIVISIVE_MIN_REACTIONS = 5

export const SOCIAL_SECTION_VALUES = [
  'ghosted',
  'talking_stage',
  'situationship',
  'no_contact',
  'healing',
  'glow_up',
  'red_flags',
] as const

export type SocialSection = (typeof SOCIAL_SECTION_VALUES)[number]

export const SOCIAL_SECTION_LABELS: Record<SocialSection, string> = {
  ghosted: 'Ghosted',
  talking_stage: 'Talking Stage',
  situationship: 'Situationship',
  no_contact: 'No Contact',
  healing: 'Healing',
  glow_up: 'Glow Up',
  red_flags: 'Red Flags',
}

export const REACTION_VALUES = ['love', 'red_flag'] as const
export type SocialReaction = (typeof REACTION_VALUES)[number]

// Posts are photo-only by design: the schema has no caption/text field on purpose.
export const createSocialPostSchema = z.object({
  section: z.enum(SOCIAL_SECTION_VALUES),
})

export const socialReactionSchema = z.object({
  reaction_type: z.enum(REACTION_VALUES),
})

export const socialFeedQuerySchema = z.object({
  section: z.enum(SOCIAL_SECTION_VALUES).optional(),
  before: z.string().datetime({ offset: true }).optional(),
})

export const socialRankingsQuerySchema = z.object({
  section: z.enum(SOCIAL_SECTION_VALUES).optional(),
})

export function validateSocialPhotoFile(file: Pick<File, 'type' | 'size'> | null | undefined) {
  if (!file) return { valid: false, error: 'A photo is required. Posts are photo-only.' }
  if (!SOCIAL_PHOTO_TYPES.includes(file.type as (typeof SOCIAL_PHOTO_TYPES)[number])) {
    return { valid: false, error: 'Use a JPG, PNG, or WebP image.' }
  }
  if (file.size > SOCIAL_PHOTO_MAX_SIZE) {
    return { valid: false, error: 'Post photos must be 5MB or smaller.' }
  }
  if (file.size === 0) return { valid: false, error: 'That image file is empty.' }
  return { valid: true, error: null }
}

// --- Community verdict ---

export type CommunityVerdict = {
  total: number
  lovePct: number
  redFlagPct: number
  label: string
}

export function computeCommunityVerdict(loveCount: number, redFlagCount: number): CommunityVerdict {
  const total = Math.max(0, loveCount) + Math.max(0, redFlagCount)
  if (total === 0) {
    return { total: 0, lovePct: 0, redFlagPct: 0, label: 'No verdict yet' }
  }
  const lovePct = Math.round((loveCount / total) * 100)
  const redFlagPct = 100 - lovePct
  // Wording targets the situation, never the person.
  let label: string
  if (lovePct >= 70) label = 'Community loves this'
  else if (redFlagPct >= 70) label = 'This situation got red-flagged'
  else label = 'The community is split'
  return { total, lovePct, redFlagPct, label }
}

// --- Reaction rules (pure, unit-testable; routes + RLS enforce them too) ---

export type ReactionDecision = 'rejected_deleted' | 'noop' | 'insert' | 'update'

export function decideReaction(input: {
  postIsDeleted: boolean
  existingReaction: SocialReaction | null
  nextReaction: SocialReaction
}): ReactionDecision {
  if (input.postIsDeleted) return 'rejected_deleted'
  if (!input.existingReaction) return 'insert'
  if (input.existingReaction === input.nextReaction) return 'noop'
  return 'update'
}

export function canDeleteSocialPost(post: { user_id: string }, userId: string) {
  return post.user_id === userId
}

// --- Rankings ---

export type RankablePost = {
  id: string
  section: SocialSection
  love_count: number
  red_flag_count: number
  reactions_today: number
}

function totalReactions(post: RankablePost) {
  return post.love_count + post.red_flag_count
}

export function rankTopLoved<T extends RankablePost>(posts: T[], limit = 5): T[] {
  return [...posts]
    .filter(post => post.love_count > 0)
    .sort((a, b) => b.love_count - a.love_count || totalReactions(b) - totalReactions(a))
    .slice(0, limit)
}

export function rankMostRedFlagged<T extends RankablePost>(posts: T[], limit = 5): T[] {
  return [...posts]
    .filter(post => post.red_flag_count > 0)
    .sort((a, b) => b.red_flag_count - a.red_flag_count || totalReactions(b) - totalReactions(a))
    .slice(0, limit)
}

export function rankMostDivisive<T extends RankablePost>(posts: T[], limit = 5, minReactions = DIVISIVE_MIN_REACTIONS): T[] {
  return [...posts]
    .filter(post => totalReactions(post) >= minReactions)
    .sort((a, b) => {
      const distanceFromSplit = (post: RankablePost) =>
        Math.abs(post.love_count / totalReactions(post) - 0.5)
      return distanceFromSplit(a) - distanceFromSplit(b) || totalReactions(b) - totalReactions(a)
    })
    .slice(0, limit)
}

export function rankTrendingToday<T extends RankablePost>(posts: T[], limit = 5): T[] {
  return [...posts]
    .filter(post => post.reactions_today > 0)
    .sort((a, b) => b.reactions_today - a.reactions_today || totalReactions(b) - totalReactions(a))
    .slice(0, limit)
}
