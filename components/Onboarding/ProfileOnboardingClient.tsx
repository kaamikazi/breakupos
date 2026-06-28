'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FIRST_GOALS,
  FIRST_GOAL_LABELS,
  ONBOARDING_REASONS,
  ONBOARDING_REASON_LABELS,
  type FirstGoal,
  type OnboardingReason,
  profileOnboardingSchema,
  suggestOnboardingUsername,
} from '@/lib/onboarding'

type InitialProfile = {
  id: string
  public_display_name: string | null
  display_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export function ProfileOnboardingClient({ profile }: { profile: InitialProfile }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [publicName, setPublicName] = useState(profile.public_display_name ?? profile.display_name ?? '')
  const [username, setUsername] = useState(suggestOnboardingUsername({
    displayName: profile.public_display_name ?? profile.display_name,
    username: profile.username,
    userId: profile.id,
  }))
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [reasons, setReasons] = useState<OnboardingReason[]>([])
  const [firstGoal, setFirstGoal] = useState<FirstGoal>('browse_social')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const progress = useMemo(() => Math.round((step / 3) * 100), [step])

  const toggleReason = (reason: OnboardingReason) => {
    setReasons(current =>
      current.includes(reason)
        ? current.filter(item => item !== reason)
        : [...current, reason]
    )
  }

  const validateStep = () => {
    setError(null)
    if (step === 1) {
      const identity = profileOnboardingSchema.pick({
        public_display_name: true,
        username: true,
        avatar_url: true,
        bio: true,
      }).safeParse({
        public_display_name: publicName,
        username,
        avatar_url: avatarUrl,
        bio,
      })
      if (!identity.success) {
        setError(identity.error.issues[0]?.message ?? 'Complete your public identity.')
        return false
      }
    }
    if (step === 2 && reasons.length === 0) {
      setError('Choose at least one reason.')
      return false
    }
    return true
  }

  const next = () => {
    if (!validateStep()) return
    setStep(current => Math.min(3, current + 1))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validateStep()) return

    const payload = {
      public_display_name: publicName,
      username,
      avatar_url: avatarUrl,
      bio,
      onboarding_reasons: reasons,
      first_goal: firstGoal,
    }
    const parsed = profileOnboardingSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please complete onboarding.')
      return
    }

    setSaving(true)
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
    setSaving(false)

    const body = await response.json().catch(() => null)
    if (!response.ok) {
      setError(typeof body?.error === 'string' ? body.error : 'Could not finish onboarding.')
      return
    }

    toast.success('Profile ready')
    router.push(typeof body?.redirectTo === 'string' ? body.redirectTo : '/social')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-2xl shadow-black/30 sm:p-5">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-400">
          <span>Step {step} of 3</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">Set up your Breakup OS identity</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              This is how people will see you on the social feed. Your private trackers and AI analysis stay private.
            </p>
          </div>
          <Input
            value={publicName}
            onChange={event => setPublicName(event.target.value)}
            placeholder="Public display name"
            className="h-11 border-zinc-700 bg-zinc-950 text-white"
          />
          <div>
            <Input
              value={username}
              onChange={event => setUsername(event.target.value.toLowerCase())}
              placeholder="username"
              className="h-11 border-zinc-700 bg-zinc-950 text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">Lowercase letters, numbers, underscore, or hyphen. 3-20 characters.</p>
          </div>
          <Input
            value={avatarUrl}
            onChange={event => setAvatarUrl(event.target.value)}
            placeholder="Avatar URL optional"
            className="h-11 border-zinc-700 bg-zinc-950 text-white"
          />
          <Textarea
            value={bio}
            onChange={event => setBio(event.target.value)}
            placeholder="Short bio optional"
            className="min-h-20 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white"
          />
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-100">
            Your public profile is separate from your private Breakup OS data.
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">What brings you here?</h2>
            <p className="mt-2 text-sm text-zinc-400">Pick the reasons that fit. You can change your mind later.</p>
          </div>
          <div className="grid gap-2">
            {ONBOARDING_REASONS.map(reason => {
              const selected = reasons.includes(reason)
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => toggleReason(reason)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? 'border-pink-500 bg-pink-500/15 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {ONBOARDING_REASON_LABELS[reason]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">Where should we take you first?</h2>
            <p className="mt-2 text-sm text-zinc-400">Choose the first thing you want Breakup OS to help with.</p>
          </div>
          <div className="grid gap-2">
            {FIRST_GOALS.map(goal => (
              <button
                key={goal}
                type="button"
                onClick={() => setFirstGoal(goal)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  firstGoal === goal
                    ? 'border-pink-500 bg-pink-500/15 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {FIRST_GOAL_LABELS[goal]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1 || saving}
          onClick={() => setStep(current => Math.max(1, current - 1))}
          className="h-11 flex-1 border-zinc-700 text-zinc-300"
        >
          Back
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={next} className="h-11 flex-1 bg-pink-500 text-white hover:bg-pink-600">
            Continue
          </Button>
        ) : (
          <Button type="submit" disabled={saving} className="h-11 flex-1 bg-pink-500 text-white hover:bg-pink-600">
            {saving ? 'Saving...' : 'Finish'}
          </Button>
        )}
      </div>
    </form>
  )
}
