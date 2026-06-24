export const ACCOUNT_DELETE_ERROR_CODES = [
  'missing_service_role',
  'unauthenticated',
  'invalid_confirmation',
  'cleanup_failed',
  'auth_delete_failed',
  'unknown_error',
] as const

export type AccountDeleteErrorCode = (typeof ACCOUNT_DELETE_ERROR_CODES)[number]

export const ACCOUNT_DELETE_SAFE_MESSAGES: Record<AccountDeleteErrorCode, string> = {
  missing_service_role: 'Account deletion is temporarily unavailable. Please contact support.',
  unauthenticated: 'Please sign in again before deleting your account.',
  invalid_confirmation: 'Please type DELETE to confirm.',
  cleanup_failed: 'Some account data could not be removed. Please try again or contact support.',
  auth_delete_failed: 'Your account could not be fully removed. Please contact support.',
  unknown_error: 'Account deletion is temporarily unavailable. Please contact support.',
}

export const ACCOUNT_DELETE_STORAGE_BUCKETS = ['profile-photos', 'social-posts'] as const

export const ACCOUNT_DELETE_ORDER = [
  'collect_storage_paths',
  'best_effort_storage_cleanup',
  'social_post_reactions_by_user',
  'social_post_reactions_by_post',
  'message_requests',
  'dating_messages_by_sender',
  'dating_messages_by_match',
  'matches',
  'profile_likes',
  'profile_passes',
  'user_blocks',
  'user_reports',
  'notifications',
  'social_posts',
  'profile_photos',
  'dating_profiles',
  'ai_usage_events',
  'credit_transactions',
  'user_credits',
  'ai_advice',
  'relationship_reports',
  'weekly_summaries',
  'interactions',
  'situations',
  'profiles',
  'auth_user',
] as const

type EnvLike = Record<string, string | undefined>

export function hasAccountDeleteServiceConfig(env: EnvLike = process.env as EnvLike) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL?.trim().startsWith('http') &&
    env.SUPABASE_SERVICE_ROLE_KEY?.trim().startsWith('eyJ')
  )
}

export function getAccountDeleteSafeMessage(code: AccountDeleteErrorCode) {
  return ACCOUNT_DELETE_SAFE_MESSAGES[code]
}

export function isOptionalSchemaDriftError(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || /does not exist/i.test(error.message ?? '')
}

export function shouldContinueAfterStorageCleanupError() {
  return true
}

export function canDeleteOnlyCurrentUser(input: { currentUserId: string | null | undefined; targetUserId: string | null | undefined }) {
  return Boolean(input.currentUserId && input.targetUserId && input.currentUserId === input.targetUserId)
}
