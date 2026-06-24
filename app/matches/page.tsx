import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { DATING_LABELS } from '@/lib/dating'
import { getVerificationBadge } from '@/lib/dating-beta'
import { isInactiveMatch } from '@/lib/dating-chat'
import { getPublicDisplayName } from '@/lib/social-profile'
import type { DatingMatch, DatingProfileWithPhotos } from '@/types'

export default async function MatchesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const serviceClient = createServiceClient()
  const { data: matches, error } = await serviceClient
    .from('matches')
    .select('*')
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState icon="!" title="Matches could not load" description={error.message} />
      </main>
    )
  }

  const typedMatches = (matches ?? []) as DatingMatch[]
  const otherUserIds = typedMatches.map(match => match.user_one_id === user.id ? match.user_two_id : match.user_one_id)

  const [{ data: profiles }, { data: photos }, publicProfilesResult] = otherUserIds.length
    ? await Promise.all([
      serviceClient.from('dating_profiles').select('*').in('user_id', otherUserIds),
      serviceClient.from('profile_photos').select('*').in('user_id', otherUserIds).order('position'),
      serviceClient.from('profiles').select('id,public_display_name,username,display_name').in('id', otherUserIds),
    ])
    : [{ data: [] }, { data: [] }, { data: [], error: null }]

  const { data: fallbackPublicProfiles } = publicProfilesResult.error && /public_display_name|username/i.test(publicProfilesResult.error.message) && otherUserIds.length
    ? await serviceClient.from('profiles').select('id,display_name').in('id', otherUserIds)
    : { data: null }
  const publicProfiles = publicProfilesResult.data ?? fallbackPublicProfiles ?? []

  const publicProfileMap = new Map((publicProfiles ?? []).map(profile => [profile.id, profile]))

  const profileMap = new Map(
    ((profiles ?? []) as DatingProfileWithPhotos[]).map(profile => [
      profile.user_id,
      {
        ...profile,
        photos: (photos ?? []).filter(photo => photo.user_id === profile.user_id),
      },
    ])
  )

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Matches</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">People who liked you back</h1>
          <p className="mt-2 text-sm text-zinc-400">Open a match to chat, use safety controls, or track the connection in Breakup OS.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/requests">
            <Button variant="outline" className="border-zinc-700 text-zinc-300">Requests</Button>
          </Link>
          <Link href="/discover">
            <Button className="bg-pink-500 text-white hover:bg-pink-600">Back to Discover</Button>
          </Link>
        </div>
      </div>

      {typedMatches.length === 0 ? (
        <EmptyState
          icon="♡"
          title="No matches yet"
          description="When someone you liked also likes you, they will appear here with a private chat."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typedMatches.map(match => {
            const otherUserId = match.user_one_id === user.id ? match.user_two_id : match.user_one_id
            const profile = profileMap.get(otherUserId)
            const publicProfile = publicProfileMap.get(otherUserId)
            const publicName = publicProfile ? getPublicDisplayName(publicProfile) : profile?.display_name ?? 'Breakup OS User'
            const photo = profile?.photos?.[0]?.photo_url
            const inactive = isInactiveMatch(match.last_activity_at ?? match.created_at)
            const verification = getVerificationBadge(profile?.verification_status)
            return (
              <Card key={match.id} className="border-zinc-800 bg-zinc-900">
                <CardContent className="space-y-4 p-4">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-zinc-800">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">No photo</div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {profile ? `${publicName}, ${profile.age}` : 'Unavailable profile'}
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Matched {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                    </p>
                    {inactive && <p className="mt-1 text-xs text-amber-300">Inactive lately. Restart gently if you reach out.</p>}
                  </div>
                  {profile && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{DATING_LABELS.relationshipGoal[profile.relationship_goal]}</Badge>
                      <Badge variant="outline">{verification.label}</Badge>
                      {profile.city && <Badge variant="secondary">{profile.city}</Badge>}
                    </div>
                  )}
                  <Link href={`/matches/${match.id}`}>
                    <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-white">
                      <MessageCircle className="mr-2 size-4" /> Open chat
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
