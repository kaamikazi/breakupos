'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { AppNotification } from '@/types'

export function NotificationsClient({ initialNotifications }: { initialNotifications: AppNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)

  const markRead = async (id: string) => {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: id }),
    })
    if (!response.ok) return
    const updated = await response.json()
    setNotifications(current => current.map(item => item.id === id ? updated : item))
  }

  return (
    <div className="grid gap-3">
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">
          No notifications yet. New matches, messages, report updates, and weekly summaries will appear here.
        </div>
      ) : notifications.map(notification => (
        <article key={notification.id} className={`rounded-xl border p-4 ${notification.read_at ? 'border-zinc-800 bg-zinc-900' : 'border-pink-500/30 bg-pink-500/10'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">{notification.title}</h2>
              <p className="mt-1 text-sm text-zinc-300">{notification.body}</p>
              <p className="mt-2 text-xs text-zinc-500">{new Date(notification.created_at).toLocaleString()}</p>
              {notification.link_url && <Link href={notification.link_url} className="mt-2 inline-block text-sm text-pink-300 hover:text-pink-200">Open</Link>}
            </div>
            {!notification.read_at && (
              <Button onClick={() => markRead(notification.id)} variant="outline" className="border-zinc-700 text-zinc-300">Mark read</Button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
