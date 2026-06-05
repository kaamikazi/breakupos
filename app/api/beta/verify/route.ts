import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { BETA_ACCESS_COOKIE, hasValidBetaAccessCode, isBetaAccessEnabled } from '@/lib/beta'
import { jsonError, parseJson } from '@/lib/api'

const betaSchema = z.object({
  code: z.string().trim().min(1).max(80),
})

export async function POST(req: NextRequest) {
  if (!isBetaAccessEnabled()) {
    return NextResponse.json({ success: true })
  }

  const parsed = await parseJson(req, betaSchema)
  if (parsed.error) return parsed.error

  if (!hasValidBetaAccessCode(parsed.data.code)) {
    return jsonError('That beta access code does not look right.', 403)
  }

  const cookieStore = await cookies()
  cookieStore.set(BETA_ACCESS_COOKIE, 'granted', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })

  return NextResponse.json({ success: true })
}
