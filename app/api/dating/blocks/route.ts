import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import { getPublicDisplayName, publicProfilePath } from '@/lib/social-profile'
import { logServerError } from '@/lib/logging'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const serviceClient = createServiceClient()
  const { data: blocks, error } = await serviceClient
    .from('user_blocks')
    .select('id,blocked_user_id,created_at')
    .eq('blocker_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logServerError('Dating blocks query failed', {
      route: 'dating/blocks',
      operation: 'list_blocks',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not load blocked profiles right now.', 500)
  }

  const blockedIds = (blocks ?? []).map(block => block.blocked_user_id)
  let { data: profiles, error: profilesError } = blockedIds.length
    ? await serviceClient
      .from('profiles')
      .select('id,public_display_name,display_name,username,avatar_url')
      .in('id', blockedIds)
    : { data: [], error: null }

  if (profilesError && /public_display_name|username|avatar_url/i.test(profilesError.message)) {
    const fallback = await serviceClient
      .from('profiles')
      .select('id,display_name')
      .in('id', blockedIds)
    profiles = (fallback.data ?? []).map(profile => ({
      id: profile.id,
      public_display_name: null,
      display_name: profile.display_name,
      username: null,
      avatar_url: null,
    }))
    profilesError = fallback.error
  }

  if (profilesError) {
    logServerError('Dating blocked profiles query failed', {
      route: 'dating/blocks',
      operation: 'list_blocked_profiles',
      code: profilesError.code ?? 'unknown',
      errorMessage: profilesError.message,
      userId: user.id,
    })
    return jsonError('Could not load blocked profiles right now.', 500)
  }

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]))
  const rows = (blocks ?? []).map(block => {
    const profile = profileMap.get(block.blocked_user_id)
    return {
      id: block.id,
      blocked_user_id: block.blocked_user_id,
      blocked_at: block.created_at,
      display_name: profile ? getPublicDisplayName(profile) : 'Breakup OS User',
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      profile_path: profile ? publicProfilePath(profile) : null,
    }
  })

  return NextResponse.json({ blocks: rows })
}
