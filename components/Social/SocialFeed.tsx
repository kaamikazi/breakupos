'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Flag, Heart, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { MessageRequestButton } from '@/components/Social/MessageRequestButton'
import {
  SOCIAL_PHOTO_MAX_SIZE,
  SOCIAL_SECTION_LABELS,
  SOCIAL_SECTION_VALUES,
  type SocialReaction,
  type SocialSection,
} from '@/lib/social'

type Verdict = { total: number; lovePct: number; redFlagPct: number; label: string }

type FeedPost = {
  id: string
  user_id: string
  image_url: string
  section: SocialSection
  created_at: string
  display_name: string
  username: string | null
  avatar_url: string | null
  profile_path: string | null
  is_owner: boolean
  love_count: number
  red_flag_count: number
  my_reaction: SocialReaction | null
  verdict: Verdict
}

export function SocialFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [section, setSection] = useState<SocialSection | ''>('')
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const loadFeed = useCallback(async (activeSection: SocialSection | '', before?: string | null) => {
    const params = new URLSearchParams()
    if (activeSection) params.set('section', activeSection)
    if (before) params.set('before', before)
    const response = await fetch(`/api/social/posts${params.size ? `?${params}` : ''}`)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'The feed could not load right now.')
    }
    return response.json() as Promise<{ posts: FeedPost[]; next_before: string | null }>
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const payload = await loadFeed(section)
        if (cancelled) return
        setPosts(payload.posts)
        setNextBefore(payload.next_before)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The feed could not load right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [section, loadFeed])

  const loadMore = async () => {
    if (!nextBefore || loadingMore) return
    setLoadingMore(true)
    try {
      const payload = await loadFeed(section, nextBefore)
      setPosts(current => [...current, ...payload.posts])
      setNextBefore(payload.next_before)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load more posts.')
    } finally {
      setLoadingMore(false)
    }
  }

  const react = async (postId: string, reaction: SocialReaction) => {
    const response = await fetch(`/api/social/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: reaction }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      toast.error(typeof payload?.error === 'string' ? payload.error : 'Reaction did not go through.')
      return
    }
    setPosts(current =>
      current.map(post =>
        post.id === postId
          ? {
              ...post,
              my_reaction: payload.my_reaction,
              love_count: payload.love_count,
              red_flag_count: payload.red_flag_count,
              verdict: payload.verdict,
            }
          : post
      )
    )
  }

  const deletePost = async (postId: string) => {
    const response = await fetch(`/api/social/posts/${postId}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not delete the post.')
      return
    }
    setPosts(current => current.filter(post => post.id !== postId))
    toast.success('Post deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSection('')}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            section === '' ? 'border-pink-500 bg-pink-500/15 text-pink-200' : 'border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          All
        </button>
        {SOCIAL_SECTION_VALUES.map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              section === value ? 'border-pink-500 bg-pink-500/15 text-pink-200' : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            {SOCIAL_SECTION_LABELS[value]}
          </button>
        ))}
        <Button
          onClick={() => setShowCreate(true)}
          className="ml-auto h-9 bg-pink-500 px-3 text-white hover:bg-pink-600"
        >
          <Plus className="size-4" /> Post a photo
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">Loading the feed...</div>
      ) : posts.length === 0 && !error ? (
        <EmptyState
          title="No posts here yet"
          description="Be the first to drop a photo. The community votes Love or Red Flag."
        />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          {posts.map(post => {
            const avatar = (
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-pink-500/15 text-sm font-semibold text-pink-200">
                {post.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Provider avatars are direct public URLs.
                  <img src={post.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  post.display_name.slice(0, 1).toUpperCase()
                )}
              </span>
            )
            return (
            <article key={post.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
              <header className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  {post.profile_path ? (
                    <Link href={post.profile_path} aria-label={`View ${post.display_name}'s profile`}>
                      {avatar}
                    </Link>
                  ) : avatar}
                  <div>
                    {post.profile_path ? (
                      <Link href={post.profile_path} className="text-sm font-medium text-white hover:text-pink-200">
                        {post.display_name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-white">{post.display_name}</span>
                    )}
                    <p className="text-xs text-zinc-500">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                    {SOCIAL_SECTION_LABELS[post.section]}
                  </span>
                  {post.is_owner && (
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Delete post"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </header>

              {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded Supabase Storage images are intentionally served directly to avoid optimizer cost during beta. */}
              <img src={post.image_url} alt="" className="aspect-square w-full bg-zinc-950 object-cover" />

              <div className="space-y-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => react(post.id, 'love')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      post.my_reaction === 'love'
                        ? 'border-pink-500 bg-pink-500/20 text-pink-200'
                        : 'border-zinc-700 text-zinc-300 hover:border-pink-500/50 hover:text-pink-200'
                    }`}
                  >
                    <Heart className={`size-4 ${post.my_reaction === 'love' ? 'fill-pink-400 text-pink-400' : ''}`} />
                    Love {post.love_count > 0 && post.love_count}
                  </button>
                  <button
                    type="button"
                    onClick={() => react(post.id, 'red_flag')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      post.my_reaction === 'red_flag'
                        ? 'border-red-500 bg-red-500/20 text-red-200'
                        : 'border-zinc-700 text-zinc-300 hover:border-red-500/50 hover:text-red-200'
                    }`}
                  >
                    <Flag className={`size-4 ${post.my_reaction === 'red_flag' ? 'fill-red-400 text-red-400' : ''}`} />
                    Red Flag {post.red_flag_count > 0 && post.red_flag_count}
                  </button>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">Community Verdict</span>
                    <span className="text-zinc-500">{post.verdict.label}</span>
                  </div>
                  {post.verdict.total > 0 ? (
                    <>
                      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div className="bg-pink-500" style={{ width: `${post.verdict.lovePct}%` }} />
                        <div className="bg-red-600" style={{ width: `${post.verdict.redFlagPct}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-zinc-500">
                        <span>❤️ {post.verdict.lovePct}%</span>
                        <span>🚩 {post.verdict.redFlagPct}%</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-600">No reactions yet. Cast the first verdict.</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                  {post.profile_path ? (
                    <Link href={post.profile_path} className="text-xs font-semibold text-zinc-400 hover:text-pink-200">
                      View profile
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-600">Profile coming soon</span>
                  )}
                  {!post.is_owner && (
                    <MessageRequestButton receiverId={post.user_id} sourcePostId={post.id} label="Reach out" compact />
                  )}
                </div>
              </div>
            </article>
            )
          })}

          {nextBefore && (
            <Button
              onClick={loadMore}
              disabled={loadingMore}
              variant="outline"
              className="border-zinc-700 text-zinc-300"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </Button>
          )}
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            setSection('')
            setLoading(true)
            loadFeed('')
              .then(payload => {
                setPosts(payload.posts)
                setNextBefore(payload.next_before)
              })
              .catch((err: Error) => setError(err.message))
              .finally(() => setLoading(false))
          }}
        />
      )}
    </div>
  )
}

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [section, setSection] = useState<SocialSection>('situationship')
  const [submitting, setSubmitting] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const pickFile = (picked: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    if (!picked) {
      setFile(null)
      setPreview(null)
      return
    }
    if (picked.size > SOCIAL_PHOTO_MAX_SIZE) {
      toast.error('Post photos must be 5MB or smaller.')
      return
    }
    const url = URL.createObjectURL(picked)
    previewUrlRef.current = url
    setFile(picked)
    setPreview(url)
  }

  const submit = async () => {
    if (!file || submitting) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('section', section)
      const response = await fetch('/api/social/posts', { method: 'POST', body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Could not publish your post.')
        return
      }
      toast.success('Posted. Let the verdict begin.')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Post a photo</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-500">
          Photos only — no captions. The community reacts with ❤️ Love or 🚩 Red Flag.
        </p>

        <label className="mb-4 block cursor-pointer">
          <span className="sr-only">Choose photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={event => pickFile(event.target.files?.[0] ?? null)}
          />
          {preview ? (
            <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Local blob preview cannot use next/image. */}
            <img src={preview} alt="Preview" className="aspect-square w-full rounded-xl border border-zinc-700 object-cover" />
            </>
          ) : (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-pink-500/50 hover:text-pink-200">
              <Plus className="size-6" />
              <span className="text-sm">Tap to choose a JPG, PNG, or WebP (max 5MB)</span>
            </div>
          )}
        </label>

        <div className="mb-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Section</p>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_SECTION_VALUES.map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setSection(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  section === value ? 'border-pink-500 bg-pink-500/15 text-pink-200' : 'border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                {SOCIAL_SECTION_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={!file || submitting}
          className="h-11 w-full bg-pink-500 text-white hover:bg-pink-600"
        >
          {submitting ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
    </div>
  )
}
