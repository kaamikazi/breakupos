'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, LayoutDashboard, Medal, MessageCircleHeart, UserRound } from 'lucide-react'
import type { Profile } from '@/types'

interface MobileBottomNavProps {
  profile: Profile | null
}

const TABS = [
  { href: '/social', label: 'Feed', icon: Heart },
  { href: '/social/rankings', label: 'Rankings', icon: Medal },
  { href: '/matches', label: 'Matches', icon: MessageCircleHeart },
  { href: '/dashboard', label: 'OS', icon: LayoutDashboard },
  { href: '/dating/profile', label: 'Profile', icon: UserRound },
]

export function MobileBottomNav({ profile }: MobileBottomNavProps) {
  const pathname = usePathname()
  if (!profile) return null
  if (/^\/matches\/[^/]+$/.test(pathname)) return null

  const activeHref = TABS
    .filter(tab => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeHref === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px] font-medium transition-colors ${
                active ? 'bg-pink-500/15 text-pink-200' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="mb-0.5 size-5" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
