'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DATING_LABELS,
  GENDER_VALUES,
  INTERESTED_IN_VALUES,
  PROFILE_PHOTO_MAX_COUNT,
  RELATIONSHIP_GOAL_VALUES,
  VISIBILITY_VALUES,
  calculateProfileQuality,
  datingProfileSchema,
  getOppositeDatingGender,
  splitInterests,
  splitPhotoUrls,
  validateProfilePhotoFile,
} from '@/lib/dating'
import { getVerificationBadge } from '@/lib/dating-beta'
import type { DatingProfileWithPhotos, ProfilePhoto } from '@/types'

interface DatingProfileFormProps {
  initialProfile: DatingProfileWithPhotos | null
}

export function DatingProfileForm({ initialProfile }: DatingProfileFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? '')
  const [age, setAge] = useState(String(initialProfile?.age ?? ''))
  const [bio, setBio] = useState(initialProfile?.bio ?? '')
  const storedGender = String(initialProfile?.gender ?? '')
  const storedInterestedIn = String(initialProfile?.interested_in ?? '')
  const initialGender = storedGender === 'male' || storedGender === 'man' ? 'male' : 'female'
  const initialInterestedIn = storedInterestedIn === 'female' || storedInterestedIn === 'women'
    ? 'female'
    : getOppositeDatingGender(initialGender)
  const [gender, setGender] = useState(initialGender)
  const [interestedIn, setInterestedIn] = useState(initialInterestedIn)
  const [relationshipGoal, setRelationshipGoal] = useState(initialProfile?.relationship_goal ?? 'figuring_out')
  const [interests, setInterests] = useState((initialProfile?.interests ?? []).join(', '))
  const [city, setCity] = useState(initialProfile?.city ?? '')
  const [visibilityStatus, setVisibilityStatus] = useState(initialProfile?.visibility_status ?? 'visible')
  const [useNickname, setUseNickname] = useState(initialProfile?.use_nickname ?? true)
  const [photos, setPhotos] = useState<ProfilePhoto[]>(initialProfile?.photos ?? [])
  const [photoUrls, setPhotoUrls] = useState((initialProfile?.photos ?? []).filter(photo => photo.source === 'url').map(photo => photo.photo_url).join('\n'))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState(initialProfile?.verification_status ?? 'unverified')

  const urlPreviews = useMemo(() => splitPhotoUrls(photoUrls), [photoUrls])
  const photoPreview = useMemo(() => [...photos.filter(photo => photo.source === 'upload').map(photo => photo.photo_url), ...urlPreviews], [photos, urlPreviews])
  const quality = useMemo(() => calculateProfileQuality({
    bio,
    interests: splitInterests(interests),
    relationship_goal: relationshipGoal,
    city,
    visibility_status: visibilityStatus,
    photos: photoPreview,
  }), [bio, interests, relationshipGoal, city, visibilityStatus, photoPreview])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      display_name: displayName,
      age: Number(age),
      bio,
      gender,
      interested_in: interestedIn,
      relationship_goal: relationshipGoal,
      interests: splitInterests(interests),
      city,
      visibility_status: visibilityStatus,
      use_nickname: useNickname,
      onboarding_completed: true,
      photo_urls: splitPhotoUrls(photoUrls),
    }

    const validated = datingProfileSchema.safeParse(payload)
    if (!validated.success) {
      setSaving(false)
      setError('Please check your profile details. Age must be 18+, and photo links must be valid URLs.')
      return
    }

    if (validated.data.visibility_status === 'visible' && photoPreview.length === 0) {
      setSaving(false)
      setError('Add at least one profile photo before making your profile visible.')
      return
    }

    const response = await fetch('/api/dating/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated.data),
    })

    setSaving(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(typeof body?.error === 'string' ? body.error : 'Could not save your dating profile.')
      return
    }

    toast.success('Dating profile saved')
    router.refresh()
    router.push('/discover')
  }

  const refreshPhotos = async () => {
    const response = await fetch('/api/dating/profile')
    if (!response.ok) return
    const profile = await response.json()
    setPhotos(profile?.photos ?? [])
  }

  const uploadPhoto = async (file: File) => {
    const validation = validateProfilePhotoFile(file)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    if (photoPreview.length >= PROFILE_PHOTO_MAX_COUNT) {
      setError(`You can add up to ${PROFILE_PHOTO_MAX_COUNT} profile photos.`)
      return
    }

    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/dating/photos', { method: 'POST', body: formData })
    setUploading(false)

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(typeof payload?.error === 'string' ? payload.error : 'Could not upload photo.')
      return
    }
    const uploadedPhoto = await response.json().catch(() => null)
    if (uploadedPhoto) {
      setPhotos(current => [...current.filter(photo => photo.id !== uploadedPhoto.id), uploadedPhoto])
    }
    toast.success('Photo uploaded')
    await refreshPhotos()
  }

  const deletePhoto = async (photoId: string) => {
    const deletedPhoto = photos.find(photo => photo.id === photoId)
    const response = await fetch(`/api/dating/photos/${photoId}`, { method: 'DELETE' })
    if (!response.ok) {
      toast.error('Could not delete photo')
      return
    }
    toast.success('Photo deleted')
    if (deletedPhoto?.source === 'url') {
      setPhotoUrls(current => splitPhotoUrls(current).filter(url => url !== deletedPhoto.photo_url).join('\n'))
    }
    await refreshPhotos()
  }

  const reorderPhoto = async (photoId: string, direction: -1 | 1) => {
    const ordered = [...photos].sort((a, b) => a.position - b.position)
    const index = ordered.findIndex(photo => photo.id === photoId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return
    const copy = [...ordered]
    ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
    const response = await fetch('/api/dating/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_ids: copy.map(photo => photo.id) }),
    })
    if (!response.ok) {
      toast.error('Could not reorder photos')
      return
    }
    setPhotos(await response.json())
  }

  const requestVerification = async () => {
    const response = await fetch('/api/dating/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_note: 'Requested from profile page' }),
    })
    if (!response.ok) {
      toast.error('Could not request verification')
      return
    }
    const payload = await response.json()
    setVerificationStatus(payload.verification_status ?? 'pending')
    toast.success('Verification requested')
  }

  const verificationBadge = getVerificationBadge(verificationStatus)
  const updateGender = (value: string) => {
    setGender(value)
    setInterestedIn(getOppositeDatingGender(value))
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-white">Dating profile</CardTitle>
          <CardDescription>
            Use a nickname if you want a softer privacy boundary while you test discovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-white">Trust status</div>
              <Badge variant="outline" className="mt-1">{verificationBadge.label}</Badge>
            </div>
            <Button type="button" onClick={requestVerification} disabled={verificationStatus === 'pending' || verificationStatus === 'verified'} variant="outline" className="border-zinc-700 text-zinc-300">
              {verificationStatus === 'pending' ? 'Pending review' : 'Request verification'}
            </Button>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="display-name">Display name or nickname</Label>
            <Input id="display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" inputMode="numeric" value={age} onChange={event => setAge(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={event => setCity(event.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={event => setBio(event.target.value)}
              placeholder="A few lines about your energy, boundaries, and what you enjoy."
              className="min-h-28"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Gender" value={gender} onChange={updateGender} options={GENDER_VALUES} labels={DATING_LABELS.gender} />
            <SelectField label="Interested in" value={interestedIn} onChange={setInterestedIn} options={INTERESTED_IN_VALUES} labels={DATING_LABELS.interestedIn} />
            <SelectField label="Goal" value={relationshipGoal} onChange={setRelationshipGoal} options={RELATIONSHIP_GOAL_VALUES} labels={DATING_LABELS.relationshipGoal} />
            <SelectField label="Visibility" value={visibilityStatus} onChange={setVisibilityStatus} options={VISIBILITY_VALUES} labels={DATING_LABELS.visibility} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="interests">Interests</Label>
            <Input id="interests" value={interests} onChange={event => setInterests(event.target.value)} placeholder="coffee, books, hiking" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photos">Profile photo URLs</Label>
            <Textarea
              id="photos"
              value={photoUrls}
              onChange={event => setPhotoUrls(event.target.value)}
              placeholder="Paste up to 6 image URLs, one per line."
              className="min-h-24"
            />
            <p className="text-xs text-zinc-500">URL photos still work, but uploaded photos are safer to manage and delete from storage.</p>
          </div>

          <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div>
              <Label htmlFor="photo-upload">Upload profile photos</Label>
              <p className="mt-1 text-xs text-zinc-500">JPG, PNG, or WebP. Max 5MB each. Photos are public for discovery display in this beta.</p>
            </div>
            <Input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading || photoPreview.length >= PROFILE_PHOTO_MAX_COUNT}
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) void uploadPhoto(file)
                event.currentTarget.value = ''
              }}
            />
            {photos.length > 0 && (
              <div className="grid gap-2">
                {[...photos].sort((a, b) => a.position - b.position).map((photo, index) => (
                  <div key={photo.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.photo_url} alt="" className="size-14 rounded-md object-cover" />
                    <div className="min-w-0 flex-1 text-xs text-zinc-400">
                      <div className="font-medium text-zinc-200">{photo.source === 'upload' ? 'Uploaded photo' : 'URL photo'} {photo.is_primary ? '(primary)' : ''}</div>
                      <div>{photo.mime_type ?? 'external URL'}{photo.size_bytes ? ` · ${(photo.size_bytes / 1024 / 1024).toFixed(1)}MB` : ''}</div>
                    </div>
                    <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => reorderPhoto(photo.id, -1)} className="border-zinc-700 text-zinc-300">Up</Button>
                    <Button type="button" size="sm" variant="outline" disabled={index === photos.length - 1} onClick={() => reorderPhoto(photo.id, 1)} className="border-zinc-700 text-zinc-300">Down</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => deletePhoto(photo.id)} className="border-red-500/40 text-red-200">Delete</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={useNickname}
              onChange={event => setUseNickname(event.target.checked)}
              className="mt-1"
            />
            <span>
              Prefer nickname mode. Keep legal names, workplace details, addresses, and exact routines out of your dating profile.
            </span>
          </label>

          <Button type="submit" disabled={saving} className="bg-pink-500 text-white hover:bg-pink-600">
            {saving ? 'Saving...' : 'Save and open Discover'}
          </Button>
        </CardContent>
      </Card>

      <aside className="grid content-start gap-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Preview</CardTitle>
            <CardDescription>This is the lightweight card people will see in discovery.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="aspect-[4/5] bg-zinc-800">
                {photoPreview[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">Photo preview</div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="text-xl font-semibold text-white">
                  {displayName || 'Nickname'}{age ? `, ${age}` : ''}
                </div>
                <p className="text-sm text-zinc-400">{city || 'City optional'}</p>
                <p className="line-clamp-4 text-sm text-zinc-300">{bio || 'Your bio will appear here.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Profile quality</CardTitle>
            <CardDescription>{quality.score}/100 completeness score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-cyan-300" style={{ width: `${quality.score}%` }} />
            </div>
            <ul className="space-y-2 text-sm text-zinc-400">
              {quality.recommendations.length
                ? quality.recommendations.slice(0, 4).map(item => <li key={item}>• {item}</li>)
                : <li>Your profile is in strong shape for discovery.</li>}
            </ul>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm leading-relaxed text-cyan-100">
          Breakup OS discovery is privacy-first beta software. Avoid minors, harassment, coercion, threats, stalking, exact routines, financial details, and crisis-sensitive content. Read the <Link href="/safety" className="underline">Safety Center</Link> before going live.
        </div>
      </aside>
    </form>
  )
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly T[]
  labels: Record<T, string>
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-zinc-200">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value as T)}
        className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-pink-500"
      >
        {options.map(option => (
          <option key={option} value={option}>{labels[option]}</option>
        ))}
      </select>
    </label>
  )
}
