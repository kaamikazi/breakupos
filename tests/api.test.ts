import { describe, expect, it } from 'vitest'
import { rateLimit } from '@/lib/api'

describe('api helpers', () => {
  it('rate limits after threshold', () => {
    const key = `test-${Date.now()}-${Math.random()}`

    expect(rateLimit(key, 2, 1000).limited).toBe(false)
    expect(rateLimit(key, 2, 1000).limited).toBe(false)
    expect(rateLimit(key, 2, 1000).limited).toBe(true)
  })
})
