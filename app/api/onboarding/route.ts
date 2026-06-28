import { NextRequest, NextResponse } from 'next/server'
import { jsonError, parseJson } from '@/lib/api'
import { canUseUsername, getFirstGoalRedirect, profileOnboardingSchema } from '@/lib/onboarding'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

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

  if (usernameError) return jsonError('Could not check username availability.', 500)
  if (!canUseUsername(usernameOwner?.id, user.id)) return jsonError('That username is taken. Try another one.', 409)

  const now = new Date().toISOString()
  const { error } = await serviceClient
    .from('profiles')
    .update({
      public_display_name: parsed.data.public_display_name,
      display_name: parsed.data.public_display_name,
      username,
      avatar_url: parsed.data.avatar_url || null,
      bio: parsed.data.bio ?? '',
      onboarding_reasons: parsed.data.onboarding_reasons,
      first_goal: parsed.data.first_goal,
      public_profile_visible: true,
      profile_completed_at: now,
    })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return jsonError('That username is taken. Try another one.', 409)
    return jsonError('Could not save onboarding. Please try again.', 500)
  }

  return NextResponse.json({
    success: true,
    redirectTo: getFirstGoalRedirect(parsed.data.first_goal),
  })
}
