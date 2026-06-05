import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/shared/Navbar'
import { AppLockGate } from '@/components/shared/AppLockGate'
import type { Profile } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://breakupos.com'

export const metadata: Metadata = {
  title: 'BreakupOS - Private relationship clarity for messy modern dating',
  description: 'A privacy-minded relationship CRM for tracking situations, no-contact recovery, red flags, and AI-assisted reflection. Not therapy or crisis support.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'BreakupOS - Private relationship clarity',
    description: 'Track situations, patterns, no-contact recovery, and AI-assisted reflection without pretending it is therapy.',
    url: APP_URL,
    siteName: 'BreakupOS',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BreakupOS - Private relationship clarity',
    description: 'A privacy-minded relationship CRM for dating patterns, no-contact recovery, and AI-assisted reflection.',
  },
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data as Profile | null
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <Navbar profile={profile} />
        <AppLockGate />
        <main>{children}</main>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  )
}
