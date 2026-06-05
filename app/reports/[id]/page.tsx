import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: report } = await supabase
    .from('relationship_reports')
    .select('content_html')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!report) notFound()

  return (
    <iframe
      title="Relationship report"
      srcDoc={report.content_html}
      className="h-[calc(100vh-56px)] w-full border-0 bg-white"
      sandbox="allow-same-origin allow-scripts"
    />
  )
}
