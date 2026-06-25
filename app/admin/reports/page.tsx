import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/admin'
import { AdminReportsClient, type AdminReport } from '@/components/Admin/AdminReportsClient'

export default async function AdminReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/dashboard')

  const serviceClient = createServiceClient()
  const { data: reports } = await serviceClient
    .from('user_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  const reportedIds = [...new Set((reports ?? []).map(report => report.reported_user_id))]
  const { data: reportedProfiles } = reportedIds.length
    ? await serviceClient.from('dating_profiles').select('user_id,verification_status').in('user_id', reportedIds)
    : { data: [] }
  const verificationMap = new Map((reportedProfiles ?? []).map(profile => [profile.user_id, profile.verification_status]))
  const enrichedReports = (reports ?? []).map(report => ({
    ...report,
    reported_verification_status: verificationMap.get(report.reported_user_id) ?? null,
  }))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Admin only</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Dating reports moderation</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Review reports for harassment, scams, explicit content, fake profiles, underage concerns, spam, and other safety issues.
        </p>
      </div>
      <AdminReportsClient initialReports={enrichedReports as AdminReport[]} />
    </main>
  )
}
