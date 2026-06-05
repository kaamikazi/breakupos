'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DATING_LABELS, GENDER_VALUES, INTERESTED_IN_VALUES, PROFILE_PHOTO_MAX_COUNT, RELATIONSHIP_GOAL_VALUES, datingProfileSchema, getOppositeDatingGender, splitInterests, validateProfilePhotoFile } from '@/lib/dating'

const steps = ['Basics', 'Goals', 'Interests', 'Photos', 'Safety']

export function DatingOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState('female')
  const [interestedIn, setInterestedIn] = useState('male')
  const [relationshipGoal, setRelationshipGoal] = useState('figuring_out')
  const [interests, setInterests] = useState('')
  const [photoCount, setPhotoCount] = useState(0)
  const [acceptedSafety, setAcceptedSafety] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const progress = useMemo(() => Math.round((step / steps.length) * 100), [step])
  const updateGender = (value: string) => {
    setGender(value)
    setInterestedIn(getOppositeDatingGender(value))
  }

  const uploadPhoto = async (file: File) => {
    const validation = validateProfilePhotoFile(file)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    if (photoCount >= PROFILE_PHOTO_MAX_COUNT) {
      setError(`You can add up to ${PROFILE_PHOTO_MAX_COUNT} photos.`)
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/dating/photos', { method: 'POST', body: formData })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not upload photo.')
      return
    }
    setPhotoCount(current => current + 1)
    toast.success('Photo uploaded')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!acceptedSafety) {
      setError('Please review and accept the safety expectations.')
      return
    }
    if (photoCount < 1) {
      setError('Add at least one profile photo before finishing onboarding.')
      setStep(4)
      return
    }
    const payload = {
      display_name: displayName,
      age: Number(age),
      bio,
      gender,
      interested_in: interestedIn,
      relationship_goal: relationshipGoal,
      interests: splitInterests(interests),
      city,
      visibility_status: 'visible',
      use_nickname: true,
      onboarding_completed: true,
      photo_urls: [],
    }
    const parsed = datingProfileSchema.safeParse(payload)
    if (!parsed.success) {
      setError('Please complete all required fields. Age must be 18 or older.')
      return
    }
    setSaving(true)
    const response = await fetch('/api/dating/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
    setSaving(false)
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(typeof body?.error === 'string' ? body.error : 'Could not finish onboarding.')
      return
    }
    router.push('/discover')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm text-zinc-400">
          <span>Step {step} of {steps.length}: {steps[step - 1]}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-pink-500" style={{ width: `${progress}%` }} /></div>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {step === 1 && <div className="grid gap-4">
        <Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Display name or nickname" />
        <Input value={age} onChange={event => setAge(event.target.value)} inputMode="numeric" placeholder="Age" />
        <Input value={city} onChange={event => setCity(event.target.value)} placeholder="City or region" />
        <Textarea value={bio} onChange={event => setBio(event.target.value)} placeholder="A short bio with your energy, boundaries, and what you enjoy." />
      </div>}

      {step === 2 && <div className="grid gap-4">
        <Select value={gender} onChange={updateGender} options={GENDER_VALUES} labels={DATING_LABELS.gender} />
        <Select value={interestedIn} onChange={setInterestedIn} options={INTERESTED_IN_VALUES} labels={DATING_LABELS.interestedIn} />
        <Select value={relationshipGoal} onChange={setRelationshipGoal} options={RELATIONSHIP_GOAL_VALUES} labels={DATING_LABELS.relationshipGoal} />
      </div>}

      {step === 3 && <div className="grid gap-3">
        <Input value={interests} onChange={event => setInterests(event.target.value)} placeholder="coffee, books, hiking" />
        <p className="text-sm text-zinc-400">Add a few interests so compatibility previews have something real to work with.</p>
      </div>}

      {step === 4 && <div className="grid gap-3">
        <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
          const file = event.target.files?.[0]
          if (file) void uploadPhoto(file)
          event.currentTarget.value = ''
        }} />
        <p className="text-sm text-zinc-400">{photoCount} uploaded. Add at least one clear photo. JPG, PNG, or WebP, max 5MB.</p>
      </div>}

      {step === 5 && <div className="grid gap-4 text-sm leading-relaxed text-zinc-300">
        <p>Keep early chats respectful, consensual, and low-pressure. Do not use the app for harassment, coercion, threats, stalking, explicit pressure, minor/underage contact, scams, or crisis escalation.</p>
        <p>Breakup OS AI can be wrong. Use it as reflection, not proof, therapy, legal advice, or emergency support.</p>
        <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <input type="checkbox" checked={acceptedSafety} onChange={event => setAcceptedSafety(event.target.checked)} className="mt-1" />
          <span>I understand the safety and privacy expectations.</span>
        </label>
      </div>}

      <div className="mt-6 flex justify-between gap-3">
        <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep(current => Math.max(1, current - 1))} className="border-zinc-700 text-zinc-300">Back</Button>
        {step < steps.length ? (
          <Button type="button" onClick={() => setStep(current => Math.min(steps.length, current + 1))} className="bg-pink-500 text-white hover:bg-pink-600">Continue</Button>
        ) : (
          <Button type="submit" disabled={saving} className="bg-pink-500 text-white hover:bg-pink-600">{saving ? 'Finishing...' : 'Finish onboarding'}</Button>
        )}
      </div>
    </form>
  )
}

function Select<T extends string>({ value, onChange, options, labels }: { value: T; onChange: (value: T) => void; options: readonly T[]; labels: Record<T, string> }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value as T)} className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
      {options.map(option => <option key={option} value={option}>{labels[option]}</option>)}
    </select>
  )
}
