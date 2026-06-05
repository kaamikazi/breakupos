import { z } from 'zod'
import { calculateProfileQuality, type QualityProfile } from '@/lib/dating'
import { fallbackAnalysis } from '@/lib/message-analysis'
import type { DatingMessage, DatingProfileWithPhotos, ProfileLike } from '@/types'

export const FREE_DAILY_LIKE_LIMIT = 20
export const PRO_DAILY_LIKE_LIMIT = null

export const advancedDiscoveryFilterSchema = z.object({
  min_age: z.coerce.number().int().min(18).max(99).optional(),
  max_age: z.coerce.number().int().min(18).max(99).optional(),
  city: z.string().trim().max(80).optional(),
  relationship_goal: z.enum(['long_term', 'short_term', 'friendship', 'figuring_out']).optional(),
  shared_interests: z.coerce.boolean().optional().default(false),
  min_quality: z.coerce.number().int().min(0).max(100).optional(),
  recently_active: z.coerce.boolean().optional().default(false),
}).refine(data => !data.min_age || !data.max_age || data.min_age <= data.max_age, {
  message: 'Minimum age must be less than or equal to maximum age.',
  path: ['min_age'],
})

export const icebreakerSchema = z.object({
  target_user_id: z.string().uuid(),
  tone: z.enum(['playful', 'warm', 'curious', 'direct']).default('warm'),
})

export type DiscoveryFilters = z.infer<typeof advancedDiscoveryFilterSchema>
export type IcebreakerTone = z.infer<typeof icebreakerSchema>['tone']

export function getDailyLikeWindow(now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export function getDailyLikeStatus({ plan, likesToday }: { plan: string | null | undefined; likesToday: number }) {
  if (plan === 'pro') return { limit: PRO_DAILY_LIKE_LIMIT, remaining: null, canLike: true }
  const remaining = Math.max(0, FREE_DAILY_LIKE_LIMIT - likesToday)
  return { limit: FREE_DAILY_LIKE_LIMIT, remaining, canLike: remaining > 0 }
}

export function applyAdvancedFilters<T extends DatingProfileWithPhotos>(
  profiles: T[],
  filters: DiscoveryFilters,
  currentProfile?: QualityProfile | null
) {
  const currentInterests = new Set(currentProfile?.interests ?? [])
  const now = Date.now()

  return profiles.filter(profile => {
    if (filters.min_age && profile.age < filters.min_age) return false
    if (filters.max_age && profile.age > filters.max_age) return false
    if (filters.city && !profile.city.toLowerCase().includes(filters.city.toLowerCase())) return false
    if (filters.relationship_goal && profile.relationship_goal !== filters.relationship_goal) return false
    if (filters.shared_interests && !profile.interests.some(interest => currentInterests.has(interest))) return false
    if (filters.min_quality && calculateProfileQuality(profile).score < filters.min_quality) return false
    if (filters.recently_active) {
      const days = (now - new Date(profile.updated_at).getTime()) / 86400000
      if (days > 14) return false
    }
    return true
  })
}

export function getCompatibilityPreview(profile: QualityProfile, currentProfile?: QualityProfile | null) {
  const currentInterests = new Set(currentProfile?.interests ?? [])
  const shared = (profile.interests ?? []).filter(interest => currentInterests.has(interest))
  const quality = calculateProfileQuality(profile).score
  const goalMatch = currentProfile?.relationship_goal && currentProfile.relationship_goal === profile.relationship_goal
  const score = Math.min(100, shared.length * 18 + (goalMatch ? 25 : 0) + Math.round(quality * 0.35))
  const label = score >= 70 ? 'strong' : score >= 40 ? 'moderate' : 'low'
  const confidence = Math.max(25, Math.min(85, 35 + shared.length * 10 + (goalMatch ? 15 : 0) + (quality >= 70 ? 10 : 0)))
  const reason = [
    shared.length ? `${shared.length} shared interest${shared.length === 1 ? '' : 's'}` : 'few visible shared interests',
    goalMatch ? 'similar relationship goal' : 'relationship goal may differ',
    quality >= 70 ? 'complete profile' : 'limited profile detail',
  ].join(', ')

  return { label, reason, confidence }
}

export function buildIcebreakerPrompt(profile: DatingProfileWithPhotos, tone: IcebreakerTone) {
  return `Write one respectful ${tone} dating-app first message for this visible profile.

Rules:
- No sexual, manipulative, harassing, insulting, or pressure-based language.
- Do not mention private data, hidden data, or anything not visible here.
- Keep it under 35 words.
- Ask one easy question.

Profile:
Name: ${profile.display_name}
Age: ${profile.age}
City: ${profile.city || 'not shared'}
Goal: ${profile.relationship_goal}
Bio: ${profile.bio || 'none'}
Interests: ${profile.interests.length ? profile.interests.join(', ') : 'none'}`
}

export function getIcebreakerFallback(profile: Pick<DatingProfileWithPhotos, 'display_name' | 'interests'>, tone: IcebreakerTone) {
  const interest = profile.interests[0]
  if (tone === 'playful') return interest ? `Okay, ${interest} caught my eye. What got you into it?` : `Your profile has a fun energy. What is something you are excited about lately?`
  if (tone === 'direct') return interest ? `Hey ${profile.display_name}, I noticed you like ${interest}. Want to compare notes?` : `Hey ${profile.display_name}, what are you hoping to find here?`
  if (tone === 'curious') return interest ? `I am curious about your ${interest} interest. What is your favorite part of it?` : `What is one thing your profile does not fully capture?`
  return interest ? `Hey ${profile.display_name}, I liked seeing ${interest} on your profile. What have you been enjoying about it lately?` : `Hey ${profile.display_name}, your profile seems warm. How is your week going?`
}

export function analyzeDatingChat(messages: DatingMessage[]) {
  const text = messages
    .filter(message => !message.deleted_at)
    .slice(-30)
    .map(message => message.body)
    .join('\n')
  const analysis = fallbackAnalysis(text || 'No recent dating chat messages.')
  return {
    interestLevel: analysis.interestLevel,
    consistency: text.toLowerCase().includes('busy') || text.toLowerCase().includes('later') ? 'inconsistent' : 'steady from visible messages',
    mixedSignals: analysis.mixedSignals,
    redFlags: analysis.redFlags,
    recommendedNextMove: analysis.recommendedReply,
    confidence: analysis.confidence,
  }
}

export function canExposeWhoLikedYou({ isPro, liker, blockedUserIds }: { isPro: boolean; liker: ProfileLike; blockedUserIds: Set<string> }) {
  return isPro && !blockedUserIds.has(liker.liker_user_id)
}

export function shouldNotifyNewMatch(existingMatch: unknown) {
  return !existingMatch
}
