import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DatingProfileForm } from '@/components/Dating/DatingProfileForm'
import type { DatingProfileWithPhotos } from '@/types'

export default async function DatingProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const [{ data: profile }, { data: photos }] = await Promise.all([
    supabase.from('dating_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profile_photos').select('*').eq('user_id', user.id).order('position'),
  ])

  const initialProfile = profile ? ({ ...profile, photos: photos ?? [] } as DatingProfileWithPhotos) : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 max-w-3xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Private beta dating layer</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Set up your dating profile</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Create the profile people see in discovery. Use a nickname, keep sensitive identifiers out, and hide your profile any time.
        </p>
      </div>
      <DatingProfileForm initialProfile={initialProfile} />
    </main>
  )
}
