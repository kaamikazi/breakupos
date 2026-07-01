import { afterEach, describe, expect, it, vi } from 'vitest'
import { inMemoryRateLimit, isDurableRateLimitConfigured, productionAiRateLimitGuard, rateLimit } from '@/lib/api'

describe('api helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('in-memory limiter blocks after threshold', () => {
    const key = `test-${Date.now()}-${Math.random()}`

    expect(inMemoryRateLimit(key, 2, 1000).limited).toBe(false)
    expect(inMemoryRateLimit(key, 2, 1000).limited).toBe(false)
    expect(inMemoryRateLimit(key, 2, 1000).limited).toBe(true)
  })

  it('rateLimit falls back to in-memory when Upstash is not configured', async () => {
    // No UPSTASH_REDIS_REST_URL/TOKEN in the test env, so this exercises the fallback path.
    const key = `test-async-${Date.now()}-${Math.random()}`

    expect((await rateLimit(key, 2, 1000)).limited).toBe(false)
    expect((await rateLimit(key, 2, 1000)).limited).toBe(false)
    expect((await rateLimit(key, 2, 1000)).limited).toBe(true)
  })

  it('fails production AI routes closed when Anthropic is enabled without durable rate limits', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')

    expect(isDurableRateLimitConfigured()).toBe(false)
    expect(productionAiRateLimitGuard('advisor', 'user-1')?.status).toBe(503)
  })
})
