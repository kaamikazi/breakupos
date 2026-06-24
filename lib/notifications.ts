import { z } from 'zod'
import type { Database } from '@/types/database'

export const NOTIFICATION_TYPES = ['new_match', 'new_message', 'message_request', 'report_update', 'weekly_summary'] as const

export const notificationReadSchema = z.object({
  notification_id: z.string().uuid(),
})

export function buildNotification({
  user_id,
  type,
  title,
  body,
  link_url,
}: {
  user_id: string
  type: (typeof NOTIFICATION_TYPES)[number]
  title: string
  body: string
  link_url?: string | null
}): Database['public']['Tables']['notifications']['Insert'] {
  return {
    user_id,
    type,
    title,
    body,
    link_url: link_url ?? null,
  }
}

export function markNotificationRead<T extends { id: string; read_at: string | null }>(notification: T, now = new Date()) {
  return { ...notification, read_at: notification.read_at ?? now.toISOString() }
}

export async function createNotification(
  serviceClient: { from: (table: 'notifications') => { insert: (payload: Database['public']['Tables']['notifications']['Insert']) => unknown } },
  payload: Database['public']['Tables']['notifications']['Insert']
) {
  return serviceClient.from('notifications').insert(payload)
}
