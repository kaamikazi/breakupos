import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { logServerError, logServerInfo } from '@/lib/logging'

// Called by Vercel Cron on the 1st of every month at 00:05 UTC.
// Also callable manually: GET /api/cron/reset-quotas
// Protected by CRON_SECRET — set this env var in Vercel and pass it
// as the Authorization header: "Bearer <CRON_SECRET>".

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()

  // Reset AI advice usage for free-plan users only.
  // Pro users have effectively unlimited quotas so no reset needed,
  // but resetting them is harmless and keeps the column honest.
  const { error, count } = await supabase
    .from('profiles')
    .update({ ai_advice_used: 0 })
    .neq('ai_advice_used', 0)  // skip rows already at 0 to avoid pointless writes

  if (error) {
    logServerError('Monthly quota reset failed', { route: 'cron/reset-quotas' })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logServerInfo('Monthly AI quota reset complete', { route: 'cron/reset-quotas', count: count ?? 0 })
  return NextResponse.json({
    ok: true,
    reset_at: new Date().toISOString(),
    profiles_updated: count ?? 0,
  })
}
