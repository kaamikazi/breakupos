import { describe, expect, it } from 'vitest'
import {
  DIVISIVE_MIN_REACTIONS,
  canDeleteSocialPost,
  computeCommunityVerdict,
  createSocialPostSchema,
  decideReaction,
  rankMostDivisive,
  rankMostRedFlagged,
  rankTopLoved,
  rankTrendingToday,
  socialReactionSchema,
  validateSocialPhotoFile,
  type RankablePost,
} from '@/lib/social'

const post = (overrides: Partial<RankablePost> & { id: string }): RankablePost => ({
  section: 'situationship',
  love_count: 0,
  red_flag_count: 0,
  reactions_today: 0,
  ...overrides,
})

describe('social posts', () => {
  it('rejects posts without an image', () => {
    expect(validateSocialPhotoFile(null).valid).toBe(false)
    expect(validateSocialPhotoFile(undefined).valid).toBe(false)
    expect(validateSocialPhotoFile({ type: 'image/jpeg', size: 0 }).valid).toBe(false)
  })

  it('enforces image type and size rules', () => {
    expect(validateSocialPhotoFile({ type: 'image/jpeg', size: 1024 }).valid).toBe(true)
    expect(validateSocialPhotoFile({ type: 'image/webp', size: 1024 }).valid).toBe(true)
    expect(validateSocialPhotoFile({ type: 'image/gif', size: 1024 }).valid).toBe(false)
    expect(validateSocialPhotoFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 }).valid).toBe(false)
  })

  it('rejects invalid sections and has no caption field', () => {
    expect(createSocialPostSchema.safeParse({ section: 'ghosted' }).success).toBe(true)
    expect(createSocialPostSchema.safeParse({ section: 'astrology' }).success).toBe(false)
    // Photo-only by design: captions are not part of the schema shape.
    expect(Object.keys(createSocialPostSchema.shape)).toEqual(['section'])
  })

  it('rejects invalid reaction types', () => {
    expect(socialReactionSchema.safeParse({ reaction_type: 'love' }).success).toBe(true)
    expect(socialReactionSchema.safeParse({ reaction_type: 'red_flag' }).success).toBe(true)
    expect(socialReactionSchema.safeParse({ reaction_type: 'like' }).success).toBe(false)
  })
})

describe('reaction rules', () => {
  it('updates an existing reaction instead of duplicating it', () => {
    expect(decideReaction({ postIsDeleted: false, existingReaction: 'love', nextReaction: 'red_flag' })).toBe('update')
    expect(decideReaction({ postIsDeleted: false, existingReaction: 'red_flag', nextReaction: 'love' })).toBe('update')
    expect(decideReaction({ postIsDeleted: false, existingReaction: 'love', nextReaction: 'love' })).toBe('noop')
    expect(decideReaction({ postIsDeleted: false, existingReaction: null, nextReaction: 'love' })).toBe('insert')
  })

  it('blocks reactions on deleted posts', () => {
    expect(decideReaction({ postIsDeleted: true, existingReaction: null, nextReaction: 'love' })).toBe('rejected_deleted')
    expect(decideReaction({ postIsDeleted: true, existingReaction: 'love', nextReaction: 'red_flag' })).toBe('rejected_deleted')
  })

  it('only lets the owner delete a post', () => {
    expect(canDeleteSocialPost({ user_id: 'owner-1' }, 'owner-1')).toBe(true)
    expect(canDeleteSocialPost({ user_id: 'owner-1' }, 'someone-else')).toBe(false)
  })
})

describe('community verdict', () => {
  it('handles zero reactions', () => {
    const verdict = computeCommunityVerdict(0, 0)
    expect(verdict.total).toBe(0)
    expect(verdict.label).toBe('No verdict yet')
  })

  it('computes percentages and situation-focused labels', () => {
    const loved = computeCommunityVerdict(9, 1)
    expect(loved.lovePct).toBe(90)
    expect(loved.redFlagPct).toBe(10)
    expect(loved.label).toBe('Community loves this')

    const flagged = computeCommunityVerdict(2, 8)
    expect(flagged.label).toBe('This situation got red-flagged')
    expect(flagged.label).not.toContain('user')

    const split = computeCommunityVerdict(5, 5)
    expect(split.lovePct).toBe(50)
    expect(split.label).toBe('The community is split')
  })
})

describe('rankings', () => {
  const posts: RankablePost[] = [
    post({ id: 'loved', love_count: 40, red_flag_count: 2, reactions_today: 1 }),
    post({ id: 'flagged', love_count: 3, red_flag_count: 30, reactions_today: 2 }),
    post({ id: 'divisive', love_count: 10, red_flag_count: 10, reactions_today: 0 }),
    post({ id: 'quietly-divisive', love_count: 2, red_flag_count: 2, reactions_today: 0 }),
    post({ id: 'trending', love_count: 6, red_flag_count: 5, reactions_today: 11 }),
    post({ id: 'silent', love_count: 0, red_flag_count: 0, reactions_today: 0 }),
  ]

  it('ranks top loved by love count', () => {
    const ranked = rankTopLoved(posts)
    expect(ranked[0].id).toBe('loved')
    expect(ranked.map(p => p.id)).not.toContain('silent')
  })

  it('ranks most red-flagged by red flag count', () => {
    expect(rankMostRedFlagged(posts)[0].id).toBe('flagged')
  })

  it('ranks most divisive closest to 50/50 with a minimum reaction floor', () => {
    const ranked = rankMostDivisive(posts)
    expect(ranked[0].id).toBe('divisive')
    // 2v2 is a perfect split but below the reaction floor, so it must be excluded.
    expect(DIVISIVE_MIN_REACTIONS).toBeGreaterThan(4)
    expect(ranked.map(p => p.id)).not.toContain('quietly-divisive')
  })

  it('ranks trending today by reactions in the last 24 hours', () => {
    const ranked = rankTrendingToday(posts)
    expect(ranked[0].id).toBe('trending')
    expect(ranked.map(p => p.id)).not.toContain('divisive')
  })

  it('respects the limit parameter', () => {
    expect(rankTopLoved(posts, 2)).toHaveLength(2)
  })
})
