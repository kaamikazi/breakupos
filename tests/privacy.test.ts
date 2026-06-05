import { describe, expect, it } from 'vitest'
import { deleteAllSchema } from '@/lib/privacy'

describe('privacy destructive confirmation', () => {
  it('requires exact delete confirmation', () => {
    expect(deleteAllSchema.safeParse({ confirmation: 'DELETE MY BREAKUPOS DATA' }).success).toBe(true)
    expect(deleteAllSchema.safeParse({ confirmation: 'delete' }).success).toBe(false)
  })
})
