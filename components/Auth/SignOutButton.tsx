'use client'

import { createClient } from '@/lib/supabase'

export function SignOutButton() {
  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/auth')
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="text-xs font-semibold text-zinc-400 underline underline-offset-4 transition hover:text-white"
    >
      Sign out and use a different account
    </button>
  )
}
