import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BETA_ACCESS_COOKIE, hasBetaPasswordConfigured, hasValidBetaAccessCode, isBetaAccessEnabled } from '@/lib/beta'
import { jsonError, parseJson } from '@/lib/api'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { ensureProfileForUser } from '@/lib/quota'

const betaSchema = z.object({
  code: z.string().trim().min(1).max(80),
})

export async function POST(req: NextRequest) {
  if (!isBetaAccessEnabled()) {
    return NextResponse.json({ success: true })
  }

  if (!hasBetaPasswordConfigured()) {
    return jsonError('Beta access is enabled, but no beta password is configured. Ask the admin to set BETA_ACCESS_CODE.', 503)
  }

  const parsed = await parseJson(req, betaSchema)
  if (parsed.error) return parsed.error

  if (!hasValidBetaAccessCode(parsed.data.code)) {
    return jsonError('That beta access code does not look right.', 403)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await ensureProfileForUser(user)
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('profiles')
      .update({ beta_approved_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) return jsonError('Could not approve beta access for this account.', 500)
  }

  const response = NextResponse.json({ success: true, redirectTo: user ? '/dashboard' : '/auth' })
  response.cookies.set(BETA_ACCESS_COOKIE, 'granted', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })

  return response
}
