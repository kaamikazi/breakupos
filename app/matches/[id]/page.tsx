import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MatchChatClient } from '@/components/Dating/MatchChatClient'
import { DATING_LABELS } from '@/lib/dating'
import { hasBlockBetween } from '@/lib/dating-chat'
import { isProUser } from '@/lib/premium'
import { getPublicDisplayName } from '@/lib/social-profile'
import type { DatingMessage, DatingProfileWithPhotos, UserBlock } from '@/types'

interface MatchChatPageProps {
  params: Promise<{ id: string }>
}

export default async function MatchChatPage({ params }: MatchChatPageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const serviceClient = createServiceClient()
  const { data: match } = await serviceClient
    .from('matches')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!match || (match.user_one_id !== user.id && match.user_two_id !== user.id)) notFound()

  const otherUserId = match.user_one_id === user.id ? match.user_two_id : match.user_one_id
  const [{ data: profile }, { data: photos }, { data: messages }, { data: blocks }, publicProfileResult, isPro] = await Promise.all([
    serviceClient.from('dating_profiles').select('*').eq('user_id', otherUserId).maybeSingle(),
    serviceClient.from('profile_photos').select('*').eq('user_id', otherUserId).order('position'),
    serviceClient.from('dating_messages').select('*').eq('match_id', id).order('created_at', { ascending: true }).limit(50),
    serviceClient
      .from('user_blocks')
      .select('*')
      .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${otherUserId}),and(blocker_user_id.eq.${otherUserId},blocked_user_id.eq.${user.id})`),
    serviceClient.from('profiles').select('id,public_display_name,username,display_name').eq('id', otherUserId).maybeSingle(),
    isProUser(user.id),
  ])

  if (!profile) notFound()

  const { data: fallbackPublicProfile } = publicProfileResult.error && /public_display_name|username/i.test(publicProfileResult.error.message)
    ? await serviceClient.from('profiles').select('id,display_name').eq('id', otherUserId).maybeSingle()
    : { data: null }

  await serviceClient
    .from('dating_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null)
    .is('deleted_at', null)

  const otherProfile = { ...profile, photos: (photos ?? []).map(photo => ({ ...photo, storage_path: null })) } as DatingProfileWithPhotos
  const publicProfile = publicProfileResult.data ?? fallbackPublicProfile
  const otherPublicName = publicProfile ? getPublicDisplayName(publicProfile) : otherProfile.display_name
  const primaryPhoto = otherProfile.photos[0]?.photo_url
  const typedBlocks = (blocks ?? []) as UserBlock[]
  const blocked = hasBlockBetween(typedBlocks, user.id, otherUserId)
  const blockedByCurrentUser = typedBlocks.some(block => block.blocker_user_id === user.id && block.blocked_user_id === otherUserId)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/matches" className="text-sm text-zinc-400 hover:text-white">Back to matches</Link>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Chat with {otherPublicName}</h1>
        <p className="mt-2 text-sm text-zinc-400">Realtime match chat with safety controls and optional AI reply help.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="grid content-start gap-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <div className="aspect-[4/5] bg-zinc-800">
              {primaryPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">No photo</div>
              )}
            </div>
            <CardContent className="space-y-3 p-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{otherPublicName}, {otherProfile.age}</h2>
                <p className="text-sm text-zinc-400">{otherProfile.city || 'City not shared'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{DATING_LABELS.relationshipGoal[otherProfile.relationship_goal]}</Badge>
                {otherProfile.interests.slice(0, 5).map(interest => <Badge key={interest} variant="secondary">{interest}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
            <Shield className="mt-0.5 size-4 shrink-0" />
            Keep personal addresses, financial details, workplace routines, and crisis-sensitive content out of early dating chats. Use block/report if anything feels unsafe.
          </div>
        </aside>

        <MatchChatClient
          matchId={id}
          currentUserId={user.id}
          otherProfile={otherProfile}
          otherPublicName={otherPublicName}
          initialMessages={(messages ?? []) as DatingMessage[]}
          isBlocked={blocked}
          blockedByCurrentUser={blockedByCurrentUser}
          isPro={isPro}
        />
      </div>
    </main>
  )
}
