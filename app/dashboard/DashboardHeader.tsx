'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SituationForm } from '@/components/Situation/SituationForm'
import type { Profile } from '@/types'

interface DashboardHeaderProps {
  profile: Profile | null
  situationCount: number
}

export function DashboardHeader({ profile, situationCount }: DashboardHeaderProps) {
  const [showForm, setShowForm] = useState(false)

  const atLimit = profile?.plan === 'free' && situationCount >= (profile?.situations_limit ?? 5)

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {situationCount} active situation{situationCount !== 1 ? 's' : ''}
          {profile?.plan === 'free' && ` · ${situationCount}/${profile.situations_limit} free`}
        </p>
      </div>
      <Button
        onClick={() => setShowForm(true)}
        disabled={atLimit}
        className="bg-pink-500 hover:bg-pink-600 text-white"
        title={atLimit ? 'Upgrade to Pro for unlimited situations' : undefined}
      >
        + New Situation
      </Button>
      <SituationForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
