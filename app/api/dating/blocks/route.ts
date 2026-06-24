import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import { getPublicDisplayName, publicProfilePath } from '@/lib/social-profile'

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

  if (error) return jsonError(error.message, 500)

  const blockedIds = (blocks ?? []).map(block => block.blocked_user_id)
  const { data: profiles, error: profilesError } = blockedIds.length
    ? await serviceClient
      .from('profiles')
      .select('id,display_name,username,avatar_url')
      .in('id', blockedIds)
    : { data: [], error: null }

  if (profilesError) return jsonError(profilesError.message, 500)

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
