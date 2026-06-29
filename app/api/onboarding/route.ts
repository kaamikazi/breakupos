import { NextRequest, NextResponse } from 'next/server'
import { jsonError, parseJson } from '@/lib/api'
import { logServerError } from '@/lib/logging'
import {
  buildProfileOnboardingUpdate,
  canUseUsername,
  getFirstGoalRedirect,
  getOnboardingSaveError,
  profileOnboardingSchema,
} from '@/lib/onboarding'
import { ensureProfileForUser } from '@/lib/quota'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)
  await ensureProfileForUser(user)

  const parsed = await parseJson(req, profileOnboardingSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const username = parsed.data.username.trim().toLowerCase()

  const { data: usernameOwner, error: usernameError } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (usernameError) {
    logServerError('Onboarding username availability check failed', {
      route: '/api/onboarding',
      operation: 'check_username',
      userId: user.id,
      code: usernameError.code,
      errorMessage: usernameError.message,
    })
    const friendly = getOnboardingSaveError(usernameError)
    return jsonError(friendly.message, friendly.status)
  }
  if (!canUseUsername(usernameOwner?.id, user.id)) return jsonError('Username is already taken', 409)

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .update(buildProfileOnboardingUpdate(parsed.data, now))
    .eq('id', user.id)
    .select('id,profile_completed_at')
    .single()

  if (error) {
    logServerError('Onboarding profile update failed', {
      route: '/api/onboarding',
      operation: 'update_profile',
      userId: user.id,
      code: error.code,
      errorMessage: error.message,
    })
    const friendly = getOnboardingSaveError(error)
    return jsonError(friendly.message, friendly.status)
  }

  return NextResponse.json({
    success: true,
    redirectTo: getFirstGoalRedirect(parsed.data.first_goal),
  })
}
