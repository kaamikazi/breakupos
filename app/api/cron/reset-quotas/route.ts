import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { logServerError, logServerInfo } from '@/lib/logging'
import { authorizeCronRequest } from '@/lib/cron-security'

// Called by Vercel Cron on the 1st of every month at 00:05 UTC.
// Also callable manually: GET /api/cron/reset-quotas
// Protected by CRON_SECRET — set this env var in Vercel and pass it
// as the Authorization header: "Bearer <CRON_SECRET>".

export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest({
    configuredSecret: process.env.CRON_SECRET,
    authorization: req.headers.get('authorization'),
  })
  if (!auth.ok) {
    logServerError('Cron quota reset rejected', {
      route: 'cron/reset-quotas',
      operation: 'authorize',
      code: auth.code,
    })
    return NextResponse.json({ error: auth.message }, { status: auth.status })
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
    logServerError('Monthly quota reset failed', {
      route: 'cron/reset-quotas',
      operation: 'reset_profiles',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
    })
    return NextResponse.json({ error: 'Could not reset quotas right now.' }, { status: 500 })
  }

  logServerInfo('Monthly AI quota reset complete', { route: 'cron/reset-quotas', count: count ?? 0 })
  return NextResponse.json({
    ok: true,
    reset_at: new Date().toISOString(),
    profiles_updated: count ?? 0,
  })
}
