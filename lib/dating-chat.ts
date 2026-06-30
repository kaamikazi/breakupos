import { z } from 'zod'

export const CHAT_MESSAGE_MAX_LENGTH = 2000
export const CHAT_PAGE_SIZE = 50
export const INACTIVE_MATCH_DAYS = 14
export const CHAT_SAFETY_DISCLAIMER =
  'If this involves abuse, stalking, threats, harassment, self-harm, or immediate danger, prioritize safety: contact trusted people, local emergency services, or a qualified crisis resource. BreakupOS is not a substitute for professional help.'

export const REPLY_HELPER_TONES = [
  'gentle',
  'flirty',
  'direct',
  'playful',
  'boundary-setting',
  'slow down',
] as const

export const chatMessageSchema = z.object({
  body: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
})

export const chatPaginationSchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(CHAT_PAGE_SIZE),
})

export const replyHelperSchema = z.object({
  tone: z.enum(REPLY_HELPER_TONES).default('gentle'),
})

export type ReplyHelperTone = z.infer<typeof replyHelperSchema>['tone']

export type MatchLike = {
  id: string
  user_one_id: string
  user_two_id: string
}

export type MessageLike = {
  id: string
  sender_id: string
  body: string
  deleted_at: string | null
}

export type BlockLike = {
  id?: string
  blocker_user_id: string
  blocked_user_id: string
  created_at?: string
}

export function isMatchParticipant(match: MatchLike | null | undefined, userId: string) {
  return Boolean(match && (match.user_one_id === userId || match.user_two_id === userId))
}

export function getOtherParticipantId(match: MatchLike, userId: string) {
  if (match.user_one_id === userId) return match.user_two_id
  if (match.user_two_id === userId) return match.user_one_id
  return null
}

export function hasBlockBetween(blocks: BlockLike[] | null | undefined, userA: string, userB: string) {
  return Boolean(blocks?.some(block =>
    (block.blocker_user_id === userA && block.blocked_user_id === userB) ||
    (block.blocker_user_id === userB && block.blocked_user_id === userA)
  ))
}

export function getChatBlockState(blocks: BlockLike[] | null | undefined, currentUserId: string, otherUserId: string) {
  const blockedByMe = Boolean(blocks?.some(block =>
    block.blocker_user_id === currentUserId && block.blocked_user_id === otherUserId
  ))
  const blockedByOther = Boolean(blocks?.some(block =>
    block.blocker_user_id === otherUserId && block.blocked_user_id === currentUserId
  ))
  return {
    isBlocked: blockedByMe || blockedByOther,
    blockedByMe,
    blockedByOther,
    composerDisabled: blockedByMe || blockedByOther,
    message: blockedByMe ? 'You blocked this user.' : blockedByOther ? 'This conversation is unavailable.' : null,
  }
}

export function canBlockUser(currentUserId: string, targetUserId: string) {
  return currentUserId !== targetUserId
}

export function canUnblockBlock(block: Pick<BlockLike, 'blocker_user_id'> | null | undefined, currentUserId: string) {
  return Boolean(block && block.blocker_user_id === currentUserId)
}

export function getDeletedMessageDisplay(message: Pick<MessageLike, 'body' | 'deleted_at'>) {
  return message.deleted_at ? 'Message deleted' : message.body
}

export function maskDeletedMessageBody<T extends { body: string | null; deleted_at?: string | null }>(message: T): T {
  if (!message.deleted_at) return message
  return { ...message, body: 'Message deleted' }
}

export function isLowEffortSpam(body: string) {
  const cleaned = body.trim().toLowerCase()
  if (cleaned.length < 2) return true
  if (/^(hi|hey|yo|sup|hello)[!. ]*$/i.test(cleaned)) return false
  if (/(.)\1{8,}/.test(cleaned)) return true
  if (cleaned.split(/\s+/).length === 1 && cleaned.length < 4) return true
  return false
}

export function hasRepeatedMessageSpam(
  body: string,
  recentMessages: Array<Pick<MessageLike, 'body' | 'sender_id'> & { created_at?: string }>,
  senderId: string,
  windowMs = 10 * 60 * 1000
) {
  const now = Date.now()
  const normalized = body.trim().toLowerCase()
  return recentMessages.some(message => {
    const created = message.created_at ? new Date(message.created_at).getTime() : now
    return message.sender_id === senderId && message.body.trim().toLowerCase() === normalized && now - created <= windowMs
  })
}

export function getMessageSpamVerdict(
  body: string,
  recentMessages: Array<Pick<MessageLike, 'body' | 'sender_id'> & { created_at?: string }>,
  senderId: string
) {
  if (isLowEffortSpam(body)) return { allowed: false, reason: 'Please send a more meaningful message.' }
  if (hasRepeatedMessageSpam(body, recentMessages, senderId)) return { allowed: false, reason: 'Please avoid sending the same message repeatedly.' }
  return { allowed: true, reason: null }
}

export function isInactiveMatch(lastActivityAt: string | null | undefined, now = new Date(), inactiveDays = INACTIVE_MATCH_DAYS) {
  if (!lastActivityAt) return false
  return now.getTime() - new Date(lastActivityAt).getTime() > inactiveDays * 86400000
}

export function canSendMessage({
  match,
  userId,
  otherUserId,
  blocks,
}: {
  match: MatchLike | null | undefined
  userId: string
  otherUserId: string | null
  blocks: BlockLike[] | null | undefined
}) {
  if (!isMatchParticipant(match, userId)) return false
  if (!otherUserId) return false
  return !hasBlockBetween(blocks, userId, otherUserId)
}

export function buildReplyHelperPrompt({
  tone,
  otherDisplayName,
  messages,
}: {
  tone: ReplyHelperTone
  otherDisplayName: string
  messages: Array<Pick<MessageLike, 'sender_id' | 'body' | 'deleted_at'> & { sender_label: 'me' | 'them' }>
}) {
  const recent = messages
    .slice(-20)
    .map(message => `${message.sender_label === 'me' ? 'Me' : otherDisplayName}: ${getDeletedMessageDisplay(message)}`)
    .join('\n')

  return `Draft 3 short dating-chat replies in a ${tone} tone.

Safety rules:
- Do not encourage coercion, stalking, harassment, guilt-tripping, threats, or repeated contact after a boundary.
- If the chat suggests abuse, coercion, stalking, harassment, self-harm, or crisis, recommend safety and trusted/professional support.
- Keep suggestions respectful, consent-aware, and easy to send.
- Output plain text only.

Safety note to apply when relevant: ${CHAT_SAFETY_DISCLAIMER}

Recent chat:
${recent || 'No messages yet.'}`
}

export function getReplyHelperFallback(tone: ReplyHelperTone) {
  const toneLine = tone === 'boundary-setting'
    ? 'I want to be clear about my pace and boundaries.'
    : tone === 'slow down'
      ? 'I like talking with you, and I want to take this at a steady pace.'
      : tone === 'flirty'
        ? 'I like this energy. Want to keep the conversation going?'
        : 'I appreciate you saying that. Here is where I am at.'

  return `${toneLine}\n\n${CHAT_SAFETY_DISCLAIMER}`
}

export function buildSituationFromMatchProfile(profile: { display_name: string; city?: string | null }, matchId: string) {
  return {
    name: profile.display_name,
    avatar_emoji: '💕',
    stage: 'talking' as const,
    emotional_invest: 5,
    vibe: 'warm' as const,
    contact_method: 'bumble' as const,
    notes: `Created from dating match ${matchId}.${profile.city ? ` City: ${profile.city}.` : ''}`,
    match_id: matchId,
  }
}
