import { describe, expect, it } from 'vitest'
import {
  buildReplyHelperPrompt,
  buildSituationFromMatchProfile,
  canBlockUser,
  canSendMessage,
  canUnblockBlock,
  chatMessageSchema,
  getChatBlockState,
  getDeletedMessageDisplay,
  getOtherParticipantId,
  getReplyHelperFallback,
  hasBlockBetween,
  isMatchParticipant,
  replyHelperSchema,
} from '@/lib/dating-chat'

const match = {
  id: 'match-1',
  user_one_id: 'user-a',
  user_two_id: 'user-b',
}

describe('dating chat helpers', () => {
  it('validates chat message bodies', () => {
    expect(chatMessageSchema.safeParse({ body: 'Hey, good morning.' }).success).toBe(true)
    expect(chatMessageSchema.safeParse({ body: '' }).success).toBe(false)
    expect(chatMessageSchema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('checks match participants and other participant ids', () => {
    expect(isMatchParticipant(match, 'user-a')).toBe(true)
    expect(isMatchParticipant(match, 'user-c')).toBe(false)
    expect(getOtherParticipantId(match, 'user-a')).toBe('user-b')
    expect(getOtherParticipantId(match, 'user-c')).toBeNull()
  })

  it('handles deleted message display', () => {
    expect(getDeletedMessageDisplay({ body: 'secret', deleted_at: null })).toBe('secret')
    expect(getDeletedMessageDisplay({ body: 'secret', deleted_at: '2026-06-02T00:00:00.000Z' })).toBe('Message deleted')
  })

  it('blocks sending when either participant blocked the other', () => {
    const blocks = [{ blocker_user_id: 'user-b', blocked_user_id: 'user-a' }]
    expect(hasBlockBetween(blocks, 'user-a', 'user-b')).toBe(true)
    expect(canSendMessage({ match, userId: 'user-a', otherUserId: 'user-b', blocks })).toBe(false)
    expect(canSendMessage({ match, userId: 'user-a', otherUserId: 'user-b', blocks: [] })).toBe(true)
  })

  it('describes blocked chat state for each direction', () => {
    const blockedByMe = getChatBlockState([{ blocker_user_id: 'user-a', blocked_user_id: 'user-b' }], 'user-a', 'user-b')
    expect(blockedByMe.isBlocked).toBe(true)
    expect(blockedByMe.blockedByMe).toBe(true)
    expect(blockedByMe.composerDisabled).toBe(true)
    expect(blockedByMe.message).toBe('You blocked this user.')

    const blockedByOther = getChatBlockState([{ blocker_user_id: 'user-b', blocked_user_id: 'user-a' }], 'user-a', 'user-b')
    expect(blockedByOther.isBlocked).toBe(true)
    expect(blockedByOther.blockedByOther).toBe(true)
    expect(blockedByOther.composerDisabled).toBe(true)
    expect(blockedByOther.message).toBe('This conversation is unavailable.')
  })

  it('prevents self-blocks and only allows owners to unblock their own block', () => {
    expect(canBlockUser('user-a', 'user-a')).toBe(false)
    expect(canBlockUser('user-a', 'user-b')).toBe(true)
    expect(canUnblockBlock({ blocker_user_id: 'user-a' }, 'user-a')).toBe(true)
    expect(canUnblockBlock({ blocker_user_id: 'user-b' }, 'user-a')).toBe(false)
    expect(canUnblockBlock(null, 'user-a')).toBe(false)
  })

  it('builds a safety-aware reply helper prompt and fallback', () => {
    expect(replyHelperSchema.safeParse({ tone: 'boundary-setting' }).success).toBe(true)
    const prompt = buildReplyHelperPrompt({
      tone: 'direct',
      otherDisplayName: 'Alex',
      messages: [{ sender_id: 'user-b', sender_label: 'them', body: 'Why did you not answer?', deleted_at: null }],
    })
    expect(prompt).toContain('coercion')
    expect(prompt).toContain('Alex')
    expect(getReplyHelperFallback('slow down')).toContain('steady pace')
  })

  it('builds a situation payload from a match profile', () => {
    const payload = buildSituationFromMatchProfile({ display_name: 'Alex', city: 'Dhaka' }, 'match-1')
    expect(payload.name).toBe('Alex')
    expect(payload.match_id).toBe('match-1')
    expect(payload.notes).toContain('Dhaka')
  })
})
