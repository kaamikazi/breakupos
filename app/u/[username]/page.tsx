import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { computeCommunityVerdict, SOCIAL_SECTION_LABELS, type SocialSection } from '@/lib/social'
import { getCommunitySummary } from '@/lib/social-profile'
import { MessageRequestButton, PublicProfileSafetyActions } from '@/components/Social/MessageRequestButton'

interface PublicProfilePageProps {
  params: Promise<{ username: string }>
}

type PublicProfile = {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  public_bio: string | null
  public_vibe: string | null
  created_at: string
  public_profile_visible: boolean
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const serviceClient = createServiceClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(username)
  const { data: profile } = isUuid
    ? await serviceClient.from('profiles').select('id,display_name,username,avatar_url,public_bio,public_vibe,created_at,public_profile_visible').eq('id', username).maybeSingle()
    : await serviceClient.from('profiles').select('id,display_name,username,avatar_url,public_bio,public_vibe,created_at,public_profile_visible').eq('username', username).maybeSingle()

  const publicProfile = profile as PublicProfile | null
  if (!publicProfile?.public_profile_visible) notFound()

  const [{ data: posts }, { data: datingProfile }] = await Promise.all([
    serviceClient
      .from('social_posts')
      .select('id,image_url,section,created_at')
      .eq('user_id', publicProfile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(24),
    serviceClient
      .from('dating_profiles')
      .select('relationship_goal,city,interests,visibility_status,onboarding_completed')
      .eq('user_id', publicProfile.id)
      .maybeSingle(),
  ])

  const postIds = (posts ?? []).map(post => post.id)
  const { data: reactions } = postIds.length
    ? await serviceClient.from('social_post_reactions').select('post_id,reaction_type').in('post_id', postIds)
    : { data: [] }

  const loveCount = (reactions ?? []).filter(reaction => reaction.reaction_type === 'love').length
  const redFlagCount = (reactions ?? []).filter(reaction => reaction.reaction_type === 'red_flag').length
  const verdict = computeCommunityVerdict(loveCount, redFlagCount)
  const sectionCounts = new Map<SocialSection, number>()
  for (const post of posts ?? []) {
    const section = post.section as SocialSection
    sectionCounts.set(section, (sectionCounts.get(section) ?? 0) + 1)
  }
  const topSections = [...sectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([section]) => SOCIAL_SECTION_LABELS[section])

  const displayName = publicProfile.display_name ?? publicProfile.username ?? 'BreakupOS user'
  const isSelf = publicProfile.id === user.id
  const publicVibe = publicProfile.public_vibe?.replaceAll('_', ' ') ?? 'figuring it out'
  const datingVisible = datingProfile?.visibility_status === 'visible' && datingProfile?.onboarding_completed

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-pink-500/15 text-3xl font-bold text-pink-200">
              {publicProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicProfile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-pink-300">Public profile</p>
              <h1 className="mt-1 text-3xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-zinc-500">@{publicProfile.username ?? 'beta-user'}</p>
              <p className="mt-2 text-sm capitalize text-zinc-400">{publicVibe}</p>
              <p className="mt-1 text-xs text-zinc-600">Member since {format(new Date(publicProfile.created_at), 'MMM yyyy')}</p>
            </div>
          </div>

          {!isSelf && (
            <div className="flex w-full flex-col gap-2 sm:w-56">
              <MessageRequestButton receiverId={publicProfile.id} label="Message" />
              <PublicProfileSafetyActions targetUserId={publicProfile.id} />
            </div>
          )}
        </div>

        {publicProfile.public_bio && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300">{publicProfile.public_bio}</p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat label="Love received" value={loveCount} />
          <Stat label="Red Flags received" value={redFlagCount} />
          <Stat label="Community Verdict" value={getCommunitySummary(loveCount, redFlagCount)} />
          <Stat label="Posts" value={(posts ?? []).length} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {topSections.length ? topSections.map(section => (
            <span key={section} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">{section}</span>
          )) : (
            <span className="text-xs text-zinc-600">No public post sections yet</span>
          )}
          {datingVisible && datingProfile?.city && (
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">{datingProfile.city}</span>
          )}
        </div>

        {verdict.total > 0 && (
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-zinc-500">
              <span>{verdict.label}</span>
              <span>{verdict.total} reactions</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="bg-pink-500" style={{ width: `${verdict.lovePct}%` }} />
              <div className="bg-red-600" style={{ width: `${verdict.redFlagPct}%` }} />
            </div>
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Public posts</h2>
          <Link href="/social" className="text-xs font-semibold text-pink-300 hover:text-pink-200">Back to feed</Link>
        </div>
        {(posts ?? []).length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
            No public social posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {(posts ?? []).map(post => (
              <article key={post.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded Supabase Storage images are served directly during beta. */}
                <img src={post.image_url} alt="" className="aspect-square w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-xs text-zinc-400">{SOCIAL_SECTION_LABELS[post.section as SocialSection]}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
