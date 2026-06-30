import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_DELETE_ORDER,
  getAccountDeleteSafeMessage,
  hasAccountDeleteServiceConfig,
  isOptionalSchemaDriftError,
  shouldContinueAfterStorageCleanupError,
  canDeleteOnlyCurrentUser,
} from '@/lib/account-delete'
import { collectStoragePaths, deleteAccountSchema, deleteAllSchema, getDeleteAccountCoverageSummary, getDeleteAllCoverageSummary, hasValidDeleteAccountConfirmation } from '@/lib/privacy'

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

  it('documents delete-all coverage without deleting the auth account', () => {
    expect(getDeleteAllCoverageSummary()).toEqual(expect.arrayContaining([
      'social posts and reactions',
      'message requests',
      'dating messages and matches',
      'profile photo and social post storage objects',
      'profile counters reset while keeping the account',
    ]))
    expect(getDeleteAllCoverageSummary()).not.toContain('Supabase Auth user')
  })

  it('requires service role config before account deletion can run', () => {
    expect(hasAccountDeleteServiceConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJservice',
    })).toBe(true)
    expect(hasAccountDeleteServiceConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: '',
    })).toBe(false)
  })

  it('uses safe user-facing account deletion errors', () => {
    expect(getAccountDeleteSafeMessage('missing_service_role')).toBe('Account deletion is temporarily unavailable. Please contact support.')
    expect(getAccountDeleteSafeMessage('invalid_confirmation')).toBe('Please type DELETE to confirm.')
    expect(getAccountDeleteSafeMessage('cleanup_failed')).not.toContain('stack')
  })

  it('treats storage cleanup as best effort and schema drift as optional', () => {
    expect(shouldContinueAfterStorageCleanupError()).toBe(true)
    expect(isOptionalSchemaDriftError({ code: '42P01', message: 'relation does not exist' })).toBe(true)
    expect(isOptionalSchemaDriftError({ code: '42703', message: 'column does not exist' })).toBe(true)
    expect(isOptionalSchemaDriftError({ code: '23503', message: 'foreign key violation' })).toBe(false)
  })

  it('only permits deleting the current authenticated user', () => {
    expect(canDeleteOnlyCurrentUser({ currentUserId: 'user-1', targetUserId: 'user-1' })).toBe(true)
    expect(canDeleteOnlyCurrentUser({ currentUserId: 'user-1', targetUserId: 'user-2' })).toBe(false)
    expect(canDeleteOnlyCurrentUser({ currentUserId: null, targetUserId: 'user-2' })).toBe(false)
  })

  it('keeps auth deletion after app data cleanup', () => {
    expect(ACCOUNT_DELETE_ORDER.at(-2)).toBe('profiles')
    expect(ACCOUNT_DELETE_ORDER.at(-1)).toBe('auth_user')
    expect(ACCOUNT_DELETE_ORDER.indexOf('dating_messages_by_match')).toBeLessThan(ACCOUNT_DELETE_ORDER.indexOf('matches'))
  })
})
