import { createServiceClient } from '@/lib/supabase-server'
import { USERNAME_MAX_LENGTH, fallbackUsername } from '@/lib/social-profile'
import { isSafePublicHttpsUrl } from '@/lib/dating'

interface AuthUserProfileInput {
  id: string
  email?: string | null
  user_metadata?: {
    full_name?: string
    name?: string
    avatar_url?: string
    picture?: string
    [key: string]: unknown
  }
}

export function buildProfileDefaultsForUser(user: AuthUserProfileInput) {
  const email = user.email ?? `${user.id}@local.user`
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    'Breakup OS User'
  const baseUsername = fallbackUsername({ email, displayName, userId: user.id })
  const suffix = `-${user.id.slice(0, 6)}`
  const username = `${baseUsername.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`
  const rawAvatarUrl =
    typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url :
    typeof user.user_metadata?.picture === 'string' ? user.user_metadata.picture :
    null
  const avatarUrl = rawAvatarUrl && isSafePublicHttpsUrl(rawAvatarUrl) ? rawAvatarUrl : null

  return {
    email,
    displayName,
    publicDisplayName: displayName,
    username,
    avatarUrl,
  }
}

export async function ensureProfileForUser(user: AuthUserProfileInput) {
  const supabase = createServiceClient()
  const { email, displayName, publicDisplayName, username, avatarUrl } = buildProfileDefaultsForUser(user)

  const { data } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email,
      display_name: displayName,
      public_display_name: publicDisplayName,
      username,
      avatar_url: avatarUrl,
      public_profile_visible: true,
      plan: 'free',
      situations_count: 0,
      situations_limit: 5,
      ai_advice_used: 0,
      ai_advice_limit: 3,
    }, { onConflict: 'id', ignoreDuplicates: true })
    .select('*')
    .single()

  if (!data) return data

  if (!data.public_display_name || !data.username || (!data.avatar_url && avatarUrl) || data.public_profile_visible === null) {
    const { data: updated } = await supabase
      .from('profiles')
      .update({
        public_display_name: data.public_display_name ?? displayName,
        username: data.username ?? username,
        avatar_url: data.avatar_url ?? avatarUrl,
        public_profile_visible: data.public_profile_visible ?? true,
      })
      .eq('id', user.id)
      .select('*')
      .single()

    return updated ?? data
  }

  return data
}

export async function checkSituationsQuota(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const [{ data: profile }, { count: actualSituationsCount, error: countError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, situations_count, situations_limit')
      .eq('id', userId)
      .single(),
    supabase
      .from('situations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const situationsCount = countError ? (profile?.situations_count ?? 0) : (actualSituationsCount ?? 0)

  if (profile?.plan === 'pro') return true

  const situationsLimit = profile?.situations_limit && profile.situations_limit > 0
    ? profile.situations_limit
    : 5

  if (profile && (profile.situations_count !== situationsCount || profile.situations_limit !== situationsLimit)) {
    await supabase
      .from('profiles')
      .update({ situations_count: situationsCount, situations_limit: situationsLimit })
      .eq('id', userId)
  }

  return situationsCount < situationsLimit
}

export async function checkAIQuota(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, ai_advice_used, ai_advice_limit')
    .eq('id', userId)
    .single()

  if (!profile) return false
  if (profile.plan === 'pro') return true

  const adviceUsed = profile.ai_advice_used ?? 0
  const adviceLimit = profile.ai_advice_limit && profile.ai_advice_limit > 0
    ? profile.ai_advice_limit
    : 3

  if (profile.ai_advice_used !== adviceUsed || profile.ai_advice_limit !== adviceLimit) {
    await supabase
      .from('profiles')
      .update({ ai_advice_used: adviceUsed, ai_advice_limit: adviceLimit })
      .eq('id', userId)
  }

  return adviceUsed < adviceLimit
}

export async function getProfile(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}
