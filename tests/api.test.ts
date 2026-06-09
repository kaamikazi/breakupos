import { describe, expect, it } from 'vitest'
import { inMemoryRateLimit, rateLimit } from '@/lib/api'

describe('api helpers', () => {
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
})
