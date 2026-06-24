import { NextRequest, NextResponse } from 'next/server'
import {
  type AccountDeleteErrorCode,
  getAccountDeleteSafeMessage,
  hasAccountDeleteServiceConfig,
  isOptionalSchemaDriftError,
} from '@/lib/account-delete'
import { PROFILE_PHOTO_BUCKET } from '@/lib/dating'
import { logServerError, logServerInfo } from '@/lib/logging'
import { collectStoragePaths, deleteAccountSchema } from '@/lib/privacy'
import { SOCIAL_POST_BUCKET } from '@/lib/social'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

type SupabaseCleanupError = {
  code?: string | null
  message?: string | null
}

type MutationResult = { error: SupabaseCleanupError | null }
type CleanupStep = {
  operation: string
  table?: string
  optional?: boolean
  run: () => Promise<MutationResult>
}

function accountDeleteError(code: AccountDeleteErrorCode, status = 500) {
  return NextResponse.json(
    { error: getAccountDeleteSafeMessage(code), code },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

function logCleanupError(operation: string, error: SupabaseCleanupError, userId: string, table?: string) {
  logServerError('Account deletion cleanup step failed', {
    route: 'account-delete',
    operation,
    table,
    code: error.code ?? 'unknown',
    errorMessage: error.message ?? 'Unknown Supabase error',
    userId,
  })
}

async function runCleanupStep(step: CleanupStep, userId: string) {
  const result = await step.run()
  if (!result.error) return true

  logCleanupError(step.operation, result.error, userId, step.table)

  if (step.optional && isOptionalSchemaDriftError(result.error)) {
    logServerInfo('Account deletion skipped optional missing table or column', {
      route: 'account-delete',
      operation: step.operation,
      table: step.table,
      code: result.error.code ?? 'schema_drift',
      userId,
    })
    return true
  }

  return false
}

async function safeSelect<T>(
  operation: string,
  userId: string,
  query: PromiseLike<{ data: T[] | null; error: SupabaseCleanupError | null }>
) {
  const { data, error } = await query
  if (!error) return data ?? []

  logCleanupError(operation, error, userId)
  if (isOptionalSchemaDriftError(error)) return []
  throw new Error(operation)
}

async function deleteAccountRows(userId: string) {
  if (!hasAccountDeleteServiceConfig()) {
    logServerError('Account deletion service role config missing', {
      route: 'account-delete',
      operation: 'env_check',
      code: 'missing_service_role',
      userId,
    })
    return accountDeleteError('missing_service_role', 503)
  }

  const serviceClient = createServiceClient()

  let uploadedPhotos: Array<{ storage_path: string | null }> = []
  let socialPosts: Array<{ id: string; storage_path: string | null }> = []
  let matches: Array<{ id: string }> = []

  try {
    uploadedPhotos = await safeSelect(
      'collect_profile_photo_paths',
      userId,
      serviceClient
        .from('profile_photos')
        .select('storage_path')
        .eq('user_id', userId)
        .not('storage_path', 'is', null)
    )
    socialPosts = await safeSelect(
      'collect_social_post_paths',
      userId,
      serviceClient
        .from('social_posts')
        .select('id,storage_path')
        .eq('user_id', userId)
    )
    matches = await safeSelect(
      'collect_match_ids',
      userId,
      serviceClient
        .from('matches')
        .select('id')
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
    )
  } catch {
    return accountDeleteError('cleanup_failed', 500)
  }

  const profilePhotoPaths = collectStoragePaths(uploadedPhotos)
  const socialPostPaths = collectStoragePaths(socialPosts)

  if (profilePhotoPaths.length > 0) {
    const { error } = await serviceClient.storage.from(PROFILE_PHOTO_BUCKET).remove(profilePhotoPaths)
    if (error) {
      logServerError('Account deletion profile photo cleanup failed but continued', {
        route: 'account-delete',
        operation: 'storage_cleanup',
        bucket: PROFILE_PHOTO_BUCKET,
        code: 'storage_cleanup_failed',
        errorMessage: error.message,
        userId,
      })
    }
  }

  if (socialPostPaths.length > 0) {
    const { error } = await serviceClient.storage.from(SOCIAL_POST_BUCKET).remove(socialPostPaths)
    if (error) {
      logServerError('Account deletion social post cleanup failed but continued', {
        route: 'account-delete',
        operation: 'storage_cleanup',
        bucket: SOCIAL_POST_BUCKET,
        code: 'storage_cleanup_failed',
        errorMessage: error.message,
        userId,
      })
    }
  }

  const matchIds = matches.map(match => match.id)
  const socialPostIds = socialPosts.map(post => post.id)

  const steps: CleanupStep[] = [
    { operation: 'delete_social_post_reactions_by_user', table: 'social_post_reactions', optional: true, run: async () => serviceClient.from('social_post_reactions').delete().eq('user_id', userId) },
    ...(socialPostIds.length > 0
      ? [{ operation: 'delete_social_post_reactions_by_post', table: 'social_post_reactions', optional: true, run: async () => serviceClient.from('social_post_reactions').delete().in('post_id', socialPostIds) } satisfies CleanupStep]
      : []),
    { operation: 'delete_message_requests', table: 'message_requests', optional: true, run: async () => serviceClient.from('message_requests').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`) },
    { operation: 'delete_dating_messages_by_sender', table: 'dating_messages', optional: true, run: async () => serviceClient.from('dating_messages').delete().eq('sender_id', userId) },
    ...(matchIds.length > 0
      ? [{ operation: 'delete_dating_messages_by_match', table: 'dating_messages', optional: true, run: async () => serviceClient.from('dating_messages').delete().in('match_id', matchIds) } satisfies CleanupStep]
      : []),
    { operation: 'delete_matches', table: 'matches', optional: true, run: async () => serviceClient.from('matches').delete().or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`) },
    { operation: 'delete_profile_likes', table: 'profile_likes', optional: true, run: async () => serviceClient.from('profile_likes').delete().or(`liker_user_id.eq.${userId},liked_user_id.eq.${userId}`) },
    { operation: 'delete_profile_passes', table: 'profile_passes', optional: true, run: async () => serviceClient.from('profile_passes').delete().or(`passer_user_id.eq.${userId},passed_user_id.eq.${userId}`) },
    { operation: 'delete_user_blocks', table: 'user_blocks', optional: true, run: async () => serviceClient.from('user_blocks').delete().or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`) },
    { operation: 'delete_user_reports', table: 'user_reports', optional: true, run: async () => serviceClient.from('user_reports').delete().or(`reporter_user_id.eq.${userId},reported_user_id.eq.${userId}`) },
    { operation: 'delete_notifications', table: 'notifications', optional: true, run: async () => serviceClient.from('notifications').delete().eq('user_id', userId) },
    { operation: 'delete_social_posts', table: 'social_posts', optional: true, run: async () => serviceClient.from('social_posts').delete().eq('user_id', userId) },
    { operation: 'delete_profile_photos', table: 'profile_photos', optional: true, run: async () => serviceClient.from('profile_photos').delete().eq('user_id', userId) },
    { operation: 'delete_dating_profiles', table: 'dating_profiles', optional: true, run: async () => serviceClient.from('dating_profiles').delete().eq('user_id', userId) },
    { operation: 'delete_ai_usage_events', table: 'ai_usage_events', optional: true, run: async () => serviceClient.from('ai_usage_events').delete().eq('user_id', userId) },
    { operation: 'delete_credit_transactions', table: 'credit_transactions', optional: true, run: async () => serviceClient.from('credit_transactions').delete().eq('user_id', userId) },
    { operation: 'delete_user_credits', table: 'user_credits', optional: true, run: async () => serviceClient.from('user_credits').delete().eq('user_id', userId) },
    { operation: 'delete_ai_advice', table: 'ai_advice', optional: true, run: async () => serviceClient.from('ai_advice').delete().eq('user_id', userId) },
    { operation: 'delete_relationship_reports', table: 'relationship_reports', optional: true, run: async () => serviceClient.from('relationship_reports').delete().eq('user_id', userId) },
    { operation: 'delete_weekly_summaries', table: 'weekly_summaries', optional: true, run: async () => serviceClient.from('weekly_summaries').delete().eq('user_id', userId) },
    { operation: 'delete_interactions', table: 'interactions', optional: true, run: async () => serviceClient.from('interactions').delete().eq('user_id', userId) },
    { operation: 'delete_situations', table: 'situations', optional: true, run: async () => serviceClient.from('situations').delete().eq('user_id', userId) },
    { operation: 'delete_profile', table: 'profiles', run: async () => serviceClient.from('profiles').delete().eq('id', userId) },
  ]

  for (const step of steps) {
    const ok = await runCleanupStep(step, userId)
    if (!ok) return accountDeleteError('cleanup_failed', 500)
  }

  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId)
  if (authError) {
    logServerError('Account deletion auth user delete failed', {
      route: 'account-delete',
      operation: 'delete_auth_user',
      code: authError.status?.toString() ?? 'auth_delete_failed',
      errorMessage: authError.message,
      userId,
    })
    return accountDeleteError('auth_delete_failed', 500)
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return accountDeleteError('unauthenticated', 401)

    const body = await req.json().catch(() => null)
    const parsed = deleteAccountSchema.safeParse(body)
    if (!parsed.success) return accountDeleteError('invalid_confirmation', 400)

    const error = await deleteAccountRows(user.id)
    if (error) return error

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    logServerError('Account deletion failed unexpectedly', {
      route: 'account-delete',
      operation: 'unknown',
      code: 'unknown_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    return accountDeleteError('unknown_error', 500)
  }
}
