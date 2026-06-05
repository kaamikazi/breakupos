import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/admin'
import { adminReportStatusSchema } from '@/lib/dating'
import { jsonError, parseJson } from '@/lib/api'
import { buildNotification } from '@/lib/notifications'

interface AdminReportRouteProps {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: AdminReportRouteProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (!isAdminEmail(user.email)) return jsonError('Forbidden', 403)

  const parsed = await parseJson(req, adminReportStatusSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: currentReport } = await serviceClient
    .from('user_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!currentReport) return jsonError('Report not found', 404)

  const { data, error } = await serviceClient
    .from('user_reports')
    .update({
      status: parsed.data.status,
      internal_notes: parsed.data.internal_notes,
      reviewed_at: parsed.data.status === 'open' ? null : new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  if (parsed.data.block_reported_user) {
    await serviceClient.from('user_blocks').upsert({
      blocker_user_id: currentReport.reporter_user_id,
      blocked_user_id: currentReport.reported_user_id,
    }, { onConflict: 'blocker_user_id,blocked_user_id' })
  }

  await serviceClient.from('notifications').insert(buildNotification({
    user_id: currentReport.reporter_user_id,
    type: 'report_update',
    title: 'Report status updated',
    body: `Your report is now marked ${parsed.data.status}.`,
    link_url: '/notifications',
  }))

  return NextResponse.json(data)
}
