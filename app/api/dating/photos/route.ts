import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { PROFILE_PHOTO_BUCKET, PROFILE_PHOTO_MAX_COUNT, validateProfilePhotoFile } from '@/lib/dating'
import { getClientIp, jsonError, rateLimit } from '@/lib/api'

const reorderSchema = z.object({
  photo_ids: z.array(z.string().uuid()).min(1).max(PROFILE_PHOTO_MAX_COUNT),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`dating-photo:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Photo upload rate limit reached. Try again later.', 429)

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return jsonError('Photo file required.', 400)

  const validation = validateProfilePhotoFile(file)
  if (!validation.valid) return jsonError(validation.error ?? 'Invalid photo.', 400)

  const serviceClient = createServiceClient()
  const { count } = await serviceClient
    .from('profile_photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) >= PROFILE_PHOTO_MAX_COUNT) {
    return jsonError(`You can upload up to ${PROFILE_PHOTO_MAX_COUNT} profile photos.`, 400)
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await serviceClient.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) return jsonError(uploadError.message, 500)

  const { data: publicUrl } = serviceClient.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(storagePath)
  const position = count ?? 0
  const { data, error } = await serviceClient
    .from('profile_photos')
    .insert({
      user_id: user.id,
      photo_url: publicUrl.publicUrl,
      storage_path: storagePath,
      source: 'upload',
      mime_type: file.type,
      size_bytes: file.size,
      position,
      is_primary: position === 0,
    })
    .select()
    .single()

  if (error) {
    await serviceClient.storage.from(PROFILE_PHOTO_BUCKET).remove([storagePath])
    return jsonError(error.message, 500)
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const serviceClient = createServiceClient()
  const { data: photos } = await serviceClient
    .from('profile_photos')
    .select('id')
    .eq('user_id', user.id)

  const owned = new Set((photos ?? []).map(photo => photo.id))
  if (!parsed.data.photo_ids.every(id => owned.has(id))) return jsonError('You can only reorder your own photos.', 403)

  for (const [position, id] of parsed.data.photo_ids.entries()) {
    const { error } = await serviceClient
      .from('profile_photos')
      .update({ position, is_primary: position === 0 })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return jsonError(error.message, 500)
  }

  const { data, error } = await serviceClient
    .from('profile_photos')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data)
}
