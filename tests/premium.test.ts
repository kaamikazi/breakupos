import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_field: string, userId: string) => ({
          single: async () => ({ data: { plan: userId === 'pro-user' ? 'pro' : 'free' } }),
        }),
      }),
    }),
  }),
}))

describe('premium helper', () => {
  it('returns true only for pro users', async () => {
    const { isProUser } = await import('@/lib/premium')

    await expect(isProUser('pro-user')).resolves.toBe(true)
    await expect(isProUser('free-user')).resolves.toBe(false)
  })
})
