import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NotificationsClient } from './NotificationsClient'
import type { AppNotification } from '@/types'

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">In-app only</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Notifications</h1>
        <p className="mt-2 text-sm text-zinc-400">No email or push yet. This is the private beta notification foundation.</p>
      </div>
      <NotificationsClient initialNotifications={(data ?? []) as AppNotification[]} />
    </main>
  )
}
