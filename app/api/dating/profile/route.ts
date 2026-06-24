import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { datingProfileSchema } from '@/lib/dating'
import { jsonError, parseJson } from '@/lib/api'
import { normalizeUsername } from '@/lib/social-profile'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const [{ data: profile, error: profileError }, { data: photos, error: photosError }] = await Promise.all([
    supabase.from('dating_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profile_photos').select('*').eq('user_id', user.id).order('position'),
  ])

  if (profileError) return jsonError(profileError.message, 500)
  if (photosError) return jsonError(photosError.message, 500)

  return NextResponse.json(profile ? { ...profile, photos: photos ?? [] } : { photos: photos ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, datingProfileSchema)
  if (parsed.error) return parsed.error

  const { photo_urls, ...profileInput } = parsed.data
  const { verification_status, ...profile } = profileInput
  void verification_status
  const serviceClient = createServiceClient()
  const { data: existingPhotos } = await serviceClient
    .from('profile_photos')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  const uploadedPhotos = (existingPhotos ?? []).filter(photo => photo.source === 'upload')
  if (profile.visibility_status === 'visible' && uploadedPhotos.length + photo_urls.length === 0) {
    return jsonError('Add at least one profile photo before making your profile visible.', 400)
  }

  const { data, error } = await serviceClient
    .from('dating_profiles')
    .upsert({
      ...profile,
      user_id: user.id,
      onboarding_completed: true,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  const { data: existingPublicProfile } = await serviceClient
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const { error: publicProfileError } = await serviceClient
    .from('profiles')
    .update({
      public_display_name: profile.display_name,
      username: existingPublicProfile?.username ?? `${normalizeUsername(profile.display_name) || 'user'}-${user.id.slice(0, 8)}`.slice(0, 30),
      bio: profile.bio,
      public_profile_visible: true,
      public_location: profile.city || null,
      profile_completed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (publicProfileError) return jsonError(publicProfileError.message, 500)

  const deletePhotos = await serviceClient.from('profile_photos').delete().eq('user_id', user.id).eq('source', 'url')
  if (deletePhotos.error) return jsonError(deletePhotos.error.message, 500)

  if (photo_urls.length > 0) {
    const offset = uploadedPhotos.length
    const { error: photoError } = await serviceClient.from('profile_photos').insert(
      photo_urls.map((photoUrl, index) => ({
        user_id: user.id,
        photo_url: photoUrl,
        source: 'url',
        position: offset + index,
        is_primary: offset + index === 0,
      }))
    )
    if (photoError) return jsonError(photoError.message, 500)
  }

  const { data: photos } = await serviceClient
    .from('profile_photos')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  return NextResponse.json({ ...data, photos: photos ?? [] })
}
