'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

interface NavbarProps {
  profile: Profile | null
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Pipeline' },
  { href: '/social', label: 'Social' },
  { href: '/social/rankings', label: 'Rankings' },
  { href: '/discover', label: 'Discover' },
  { href: '/matches', label: 'Matches' },
  { href: '/requests', label: 'Requests' },
  { href: '/dating/profile', label: 'Dating Profile' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/safety', label: 'Safety' },
  { href: '/recovery', label: 'Recovery' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/analyzer', label: 'Analyzer' },
  { href: '/advisor', label: 'AI Advisor' },
  { href: '/privacy', label: 'Privacy' },
]

const betaFeedbackUrl = process.env.NEXT_PUBLIC_BETA_FEEDBACK_URL

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const isMobileChatRoute = /^\/matches\/[^/]+$/.test(pathname)
  const router = useRouter()
  const supabase = createClient()
  // Highlight only the most specific matching link (so /social/rankings lights up Rankings, not Social too).
  const activeHref = NAV_LINKS
    .filter(link => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  const [panicHidden, setPanicHidden] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('breakupos-panic-hide') === 'true'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('panic-hide', panicHidden)
  }, [panicHidden])

  const togglePanic = () => {
    const next = !panicHidden
    setPanicHidden(next)
    localStorage.setItem('breakupos-panic-hide', String(next))
    document.documentElement.classList.toggle('panic-hide', next)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className={`sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm ${isMobileChatRoute ? 'hidden md:block' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 min-h-14 flex flex-wrap items-center justify-between gap-3 py-2">
        <Link href={profile ? '/dashboard' : '/'} className="font-bold text-white text-lg tracking-tight">
          Breakup<span className="text-pink-500">OS</span>
        </Link>

        {profile && (
          <div className="hidden max-w-full items-center gap-1 overflow-x-auto md:flex">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeHref === link.href
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {betaFeedbackUrl && (
            <a
              href={betaFeedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Feedback
            </a>
          )}
          {profile ? (
            <>
              {profile.plan === 'free' && (
                <Link href="/pricing">
                  <Button size="sm" className="bg-pink-500 hover:bg-pink-600 text-white text-xs h-7">
                    Upgrade
                  </Button>
                </Link>
              )}
              {profile.plan === 'pro' && (
                <span className="text-xs text-cyan-400 font-medium">PRO</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="hidden text-xs text-zinc-400 hover:text-white sm:inline-flex"
                onClick={togglePanic}
              >
                {panicHidden ? 'Show' : 'Hide'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-white text-xs"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="bg-pink-500 hover:bg-pink-600 text-white">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
