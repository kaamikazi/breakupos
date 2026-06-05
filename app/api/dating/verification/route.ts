import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError, parseJson } from '@/lib/api'
import { verificationRequestSchema } from '@/lib/dating'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, verificationRequestSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('dating_profiles')
    .select('user_id,verification_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return jsonError('Create a dating profile before requesting verification.', 400)
  if (profile.verification_status === 'verified') return NextResponse.json({ verification_status: 'verified' })

  // TODO: replace this placeholder with selfie/video verification review intake.
  const { data, error } = await serviceClient
    .from('dating_profiles')
    .update({ verification_status: 'pending' })
    .eq('user_id', user.id)
    .select('verification_status')
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data)
}
