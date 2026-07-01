import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { PROFILE_PHOTO_BUCKET } from '@/lib/dating'
import { jsonError } from '@/lib/api'
import { logServerError } from '@/lib/logging'

interface PhotoRouteProps {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, { params }: PhotoRouteProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const serviceClient = createServiceClient()
  const { data: photo } = await serviceClient
    .from('profile_photos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!photo) return jsonError('Photo not found', 404)

  const { error } = await serviceClient
    .from('profile_photos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    logServerError('Dating photo delete failed', {
      route: 'dating/photos/[id]',
      operation: 'delete_photo',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not delete this photo right now.', 500)
  }

  if (photo.storage_path) {
    await serviceClient.storage.from(PROFILE_PHOTO_BUCKET).remove([photo.storage_path])
  }

  const { data: remaining } = await serviceClient
    .from('profile_photos')
    .select('id')
    .eq('user_id', user.id)
    .order('position')

  for (const [position, item] of (remaining ?? []).entries()) {
    await serviceClient
      .from('profile_photos')
      .update({ position, is_primary: position === 0 })
      .eq('id', item.id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
