import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isAdminEmail } from '@/lib/admin'
import { authorizeCronRequest } from '@/lib/cron-security'
import { getProtectedRouteRedirect, isPublicAppPath } from '@/lib/auth-flow'
import { maskDeletedMessageBody } from '@/lib/dating-chat'
import { profileOnboardingSchema } from '@/lib/onboarding'
import {
  buildSafeSocialFeedPayload,
  hasValidImageSignature,
  validateSocialPhotoFile,
  validateUploadedImageFile,
  type SocialPostRow,
} from '@/lib/social'
import { validateProfilePhotoFile } from '@/lib/dating'

const repoRoot = process.cwd()

function pngFile(bytes: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) {
  return new File([new Uint8Array(bytes)], 'test.png', { type: 'image/png' })
}

describe('security hardening helpers', () => {
  it('fails cron auth closed when the secret is missing or wrong', () => {
    expect(authorizeCronRequest({ configuredSecret: '', authorization: null })).toEqual({
      ok: false,
      status: 503,
      message: 'Cron endpoint is not configured.',
      code: 'missing_secret',
    })
    expect(authorizeCronRequest({ configuredSecret: 'secret', authorization: 'Bearer nope' })).toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
      code: 'unauthorized',
    })
    expect(authorizeCronRequest({ configuredSecret: 'secret', authorization: 'Bearer secret' })).toEqual({ ok: true })
  })

  it('does not mark every API route as a public app path', () => {
    expect(isPublicAppPath('/api/social/posts')).toBe(false)
    expect(isPublicAppPath('/api/beta/verify')).toBe(true)
    expect(getProtectedRouteRedirect({
      pathname: '/api/social/posts',
      authenticated: false,
      betaGateEnabled: false,
      betaApproved: false,
      onboarded: false,
    })).toBeNull()
  })

  it('filters hidden social profiles and never returns private poster ids', () => {
    const posts: SocialPostRow[] = [
      {
        id: 'post-1',
        user_id: 'poster-1',
        image_url: 'https://cdn.example/post.jpg',
        section: 'healing',
        created_at: '2026-06-01T00:00:00.000Z',
        profiles: {
          id: 'poster-1',
          public_display_name: 'kamikaze',
          username: null,
          avatar_url: null,
          public_profile_visible: true,
        },
      },
      {
        id: 'hidden-post',
        user_id: 'poster-2',
        image_url: 'https://cdn.example/hidden.jpg',
        section: 'healing',
        created_at: '2026-06-01T00:00:00.000Z',
        profiles: {
          id: 'poster-2',
          public_display_name: 'Hidden',
          username: 'hidden',
          avatar_url: null,
          public_profile_visible: false,
        },
      },
    ]

    const payload = buildSafeSocialFeedPayload(posts, [{ post_id: 'post-1', user_id: 'viewer', reaction_type: 'love' }], 'viewer')
    expect(payload).toHaveLength(1)
    expect(payload[0].display_name).toBe('kamikaze')
    expect(payload[0].username).toBeNull()
    expect(payload[0]).not.toHaveProperty('user_id')
    expect(JSON.stringify(payload)).not.toContain('email')
  })

  it('masks deleted chat message bodies before API response', () => {
    expect(maskDeletedMessageBody({ body: 'private text', deleted_at: null }).body).toBe('private text')
    expect(maskDeletedMessageBody({ body: 'private text', deleted_at: '2026-06-01T00:00:00.000Z' }).body).toBe('Message deleted')
  })

  it('validates real image signatures instead of trusting MIME only', async () => {
    expect(validateSocialPhotoFile({ type: 'image/jpeg', size: 0 }).valid).toBe(false)
    expect(validateProfilePhotoFile({ type: 'image/jpeg', size: 0 }).valid).toBe(false)
    expect(hasValidImageSignature('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
    expect(hasValidImageSignature('image/png', new TextEncoder().encode('not actually an image'))).toBe(false)
    await expect(validateUploadedImageFile(pngFile())).resolves.toMatchObject({ valid: true })
    await expect(validateUploadedImageFile(pngFile(Array.from(new TextEncoder().encode('fake png'))))).resolves.toMatchObject({ valid: false })
  })

  it('rejects unsafe avatar URLs during onboarding', () => {
    expect(profileOnboardingSchema.safeParse({
      public_display_name: 'Kamikaze',
      username: 'kamikaze',
      avatar_url: 'http://localhost/avatar.png',
      onboarding_reasons: ['exploring'],
      first_goal: 'browse_social',
    }).success).toBe(false)

    expect(profileOnboardingSchema.safeParse({
      public_display_name: 'Kamikaze',
      username: 'kamikaze',
      avatar_url: 'https://project.supabase.co/storage/v1/object/public/profile-photos/avatar.png',
      onboarding_reasons: ['exploring'],
      first_goal: 'browse_social',
    }).success).toBe(true)
  })

  it('requires verified admin identity when verification data is supplied', () => {
    const admins = ['owner@example.com']
    expect(isAdminEmail('owner@example.com', admins)).toBe(true)
    expect(isAdminEmail('owner@example.com', admins, { emailConfirmedAt: null, emailVerified: false })).toBe(false)
    expect(isAdminEmail('owner@example.com', admins, { emailConfirmedAt: '2026-06-01T00:00:00.000Z' })).toBe(true)
    expect(isAdminEmail('user@example.com', admins, { emailConfirmedAt: '2026-06-01T00:00:00.000Z' })).toBe(false)
    expect(isAdminEmail('owner@example.com', [], { emailConfirmedAt: '2026-06-01T00:00:00.000Z' })).toBe(false)
  })

  it('ships the RLS migration needed to block direct unsafe message requests', () => {
    const migration = readFileSync(join(repoRoot, 'supabase/security-hardening-beta.sql'), 'utf8')
    expect(migration).toContain('sender_id <> receiver_id')
    expect(migration).toContain('receiver.public_profile_visible = TRUE')
    expect(migration).toContain('NOT EXISTS')
    expect(migration).toContain('source_post.user_id = receiver_id')
    expect(migration).toContain('source_post.is_deleted = FALSE')
    expect(migration).toContain('refund_user_credits')
  })

  it('reserves credits before the paid message analyzer provider call', () => {
    const route = readFileSync(join(repoRoot, 'app/api/message-analyzer/route.ts'), 'utf8')
    expect(route.indexOf('await spendCredits')).toBeGreaterThan(-1)
    expect(route.indexOf('await spendCredits')).toBeLessThan(route.indexOf('anthropic.messages.create'))
    expect(route).toContain('refundCredits')
  })
})
