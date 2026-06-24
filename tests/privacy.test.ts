import { describe, expect, it } from 'vitest'
import { collectStoragePaths, deleteAccountSchema, deleteAllSchema, getDeleteAccountCoverageSummary, hasValidDeleteAccountConfirmation } from '@/lib/privacy'

describe('privacy destructive confirmation', () => {
  it('requires exact delete confirmation', () => {
    expect(deleteAllSchema.safeParse({ confirmation: 'DELETE MY BREAKUPOS DATA' }).success).toBe(true)
    expect(deleteAllSchema.safeParse({ confirmation: 'delete' }).success).toBe(false)
  })

  it('requires exact account deletion confirmation', () => {
    expect(deleteAccountSchema.safeParse({ confirmation: 'DELETE' }).success).toBe(true)
    expect(deleteAccountSchema.safeParse({ confirmation: 'delete' }).success).toBe(false)
    expect(hasValidDeleteAccountConfirmation('DELETE')).toBe(true)
    expect(hasValidDeleteAccountConfirmation('DELETE ')).toBe(false)
  })

  it('collects only persisted storage paths for deletion', () => {
    expect(collectStoragePaths([
      { storage_path: 'profiles/a.jpg' },
      { storage_path: null },
      { storage_path: '' },
      { storage_path: 'social/b.webp' },
    ])).toEqual(['profiles/a.jpg', 'social/b.webp'])
  })

  it('documents account deletion coverage', () => {
    expect(getDeleteAccountCoverageSummary()).toEqual(expect.arrayContaining([
      'Supabase Auth user',
      'message requests',
      'profile photo and social post storage objects',
    ]))
  })
})
