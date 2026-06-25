import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getPublicDisplayName, publicProfilePath } from '@/lib/social-profile'
import { MessageRequestsClient } from './MessageRequestsClient'

export default async function MessageRequestsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: requests } = await serviceClient
    .from('message_requests')
    .select('*')
    .eq('receiver_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const senderIds = [...new Set((requests ?? []).map(request => request.sender_id))]
  const sourcePostIds = [...new Set((requests ?? [])
    .map(request => request.source_post_id)
    .filter((id): id is string => Boolean(id)))]
  const [profilesResult, { data: posts }] = await Promise.all([
    senderIds.length
      ? serviceClient.from('profiles').select('id,public_display_name,display_name,username,avatar_url').in('id', senderIds)
      : Promise.resolve({ data: [], error: null }),
    sourcePostIds.length
      ? serviceClient.from('social_posts').select('id,image_url,section').in('id', sourcePostIds)
      : Promise.resolve({ data: [] }),
  ])

  const { data: fallbackProfiles } = profilesResult.error && /public_display_name|username|avatar_url/i.test(profilesResult.error.message) && senderIds.length
    ? await serviceClient.from('profiles').select('id,display_name').in('id', senderIds)
    : { data: null }
  const profiles = profilesResult.data ?? (fallbackProfiles ?? []).map(profile => ({
    id: profile.id,
    public_display_name: null,
    display_name: profile.display_name,
    username: null,
    avatar_url: null,
  }))

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]))
  const postMap = new Map((posts ?? []).map(post => [post.id, post]))

  const rows = (requests ?? []).map(request => {
    const sender = profileMap.get(request.sender_id)
    return {
      id: request.id,
      sender_id: request.sender_id,
      sender_name: sender ? getPublicDisplayName(sender) : 'Breakup OS User',
      sender_username: sender?.username ?? null,
      sender_avatar_url: sender?.avatar_url ?? null,
      sender_profile_path: sender ? publicProfilePath(sender) : null,
      message_text: request.message_text ?? '',
      status: request.status,
      created_at: request.created_at,
      source_post: request.source_post_id ? postMap.get(request.source_post_id) ?? null : null,
    }
  })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Social inbox</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Message requests</h1>
        <p className="mt-2 text-sm text-zinc-400">Accept before chat opens. Decline or block when a request does not feel right.</p>
      </div>
      <MessageRequestsClient initialRequests={rows} />
    </main>
  )
}
