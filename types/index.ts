export type Stage =
  | 'orbiting'
  | 'talking'
  | 'situationship'
  | 'dating'
  | 'no_contact'
  | 'ghosted'
  | 'red_flag_hold'
  | 'archived'

export type Vibe = 'hot' | 'warm' | 'cold' | 'dead'

export type InteractionType =
  | 'message'
  | 'date'
  | 'call'
  | 'ghost'
  | 'breadcrumb'
  | 'left_on_read'
  | 'relapse'
  | 'boundary'
  | 'conflict'
  | 'repair'
  | 'stage_change'

export type Sentiment = 'positive' | 'neutral' | 'negative'

export type AdviceType =
  | 'general'
  | 'red_flag_analysis'
  | 'move_recommendation'
  | 'exit_strategy'
  | 'draft_reply'
  | 'message_analysis'

export type AdvisorTone = 'gentle' | 'brutal' | 'therapist' | 'best_friend'

export type AdvisorMode = 'advice' | 'draft_reply' | 'analyze_message'

export type ContactMethod =
  | 'instagram'
  | 'tinder'
  | 'hinge'
  | 'bumble'
  | 'irl'
  | 'twitter'
  | 'discord'
  | 'other'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  username: string | null
  public_display_name: string | null
  avatar_url: string | null
  bio: string
  public_bio: string
  social_vibe: 'healing' | 'dating' | 'no_contact' | 'figuring_it_out' | 'glow_up'
  public_vibe: 'healing' | 'dating' | 'no_contact' | 'figuring_it_out' | 'glow_up'
  public_location: string | null
  profile_completed_at: string | null
  public_profile_visible: boolean
  plan: 'free' | 'pro'
  situations_count: number
  situations_limit: number
  ai_advice_used: number
  ai_advice_limit: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export interface Situation {
  id: string
  user_id: string
  name: string
  avatar_emoji: string
  stage: Stage
  emotional_invest: number
  compatibility: number
  first_contact: string | null
  last_interaction: string | null
  vibe: Vibe
  red_flags: string[]
  green_flags: string[]
  notes: string
  contact_method: ContactMethod
  is_archived: boolean
  is_breakup_mode?: boolean
  no_contact_started?: string | null
  no_contact_reasons?: string[]
  recovery_milestones?: string[]
  memory_summary?: string | null
  private_vault?: string
  match_id?: string | null
  situation_person_type?: 'manual' | 'matched_user'
  manual_name?: string | null
  manual_photo_url?: string | null
  matched_user_id?: string | null
  dating_profile_id?: string | null
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  situation_id: string
  user_id: string
  type: InteractionType
  note: string
  sentiment: Sentiment
  date: string
  created_at: string
}

export interface AIAdvice {
  id: string
  situation_id: string
  user_id: string
  question: string
  advice: string
  advice_type: AdviceType
  created_at: string
}

export interface CompatibilityBreakdown {
  score: number
  greenFlags: number
  redFlags: number
  emotionalInvestment: number
  sentimentTrend: number
  responseConsistency: number
  emotionalImbalance: number
  ghostingDuration: number
  conflictRecovery: number
  recency: number
  stage: number
  notes: string[]
}

export interface MessageAnalysis {
  interestLevel: number
  mixedSignals: string[]
  avoidantBehavior: string[]
  redFlags: string[]
  recommendedReply: string
  confidence: number
  explanation: string
}

export interface RelationshipReport {
  id: string
  user_id: string
  situation_id: string
  title: string
  summary: string
  recommended_next_steps: string[]
  content_html: string
  created_at: string
}

export interface WeeklySummary {
  id: string
  user_id: string
  week_start: string
  week_end: string
  emotional_trend: string
  biggest_red_flag: string
  healthiest_connection: string
  most_draining_situation: string
  no_contact_progress: string
  suggested_focus: string
  summary: string
  created_at: string
}

export type DatingGender = 'female' | 'male'
export type DatingInterestedIn = 'female' | 'male'
export type RelationshipGoal = 'long_term' | 'short_term' | 'friendship' | 'figuring_out'
export type DatingVisibility = 'visible' | 'hidden'
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type ReportReason =
  | 'harassment'
  | 'scam'
  | 'explicit_content'
  | 'spam'
  | 'fake_profile'
  | 'underage_concern'
  | 'other'
export type ReportStatus = 'open' | 'reviewed' | 'dismissed' | 'actioned'

export interface DatingProfile {
  user_id: string
  display_name: string
  age: number
  bio: string
  gender: DatingGender
  interested_in: DatingInterestedIn
  relationship_goal: RelationshipGoal
  interests: string[]
  city: string
  visibility_status: DatingVisibility
  verification_status: VerificationStatus
  use_nickname: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface ProfilePhoto {
  id: string
  user_id: string
  photo_url: string
  storage_path: string | null
  source: 'url' | 'upload'
  mime_type: string | null
  size_bytes: number | null
  position: number
  is_primary: boolean
  created_at: string
}

export interface ProfileLike {
  id: string
  liker_user_id: string
  liked_user_id: string
  created_at: string
}

export interface ProfilePass {
  id: string
  passer_user_id: string
  passed_user_id: string
  created_at: string
}

export interface DatingMatch {
  id: string
  user_one_id: string
  user_two_id: string
  last_message_at: string | null
  last_activity_at: string | null
  created_at: string
}

export type NotificationType = 'new_match' | 'new_message' | 'message_request' | 'report_update' | 'weekly_summary'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link_url: string | null
  read_at: string | null
  created_at: string
}

export interface DatingMessage {
  id: string
  match_id: string
  sender_id: string
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  read_at: string | null
}

export interface UserBlock {
  id: string
  blocker_user_id: string
  blocked_user_id: string
  reason: string | null
  created_at: string
}

export interface UserReport {
  id: string
  reporter_user_id: string
  reported_user_id: string
  reason: ReportReason
  details: string
  status: ReportStatus
  internal_notes: string
  reviewed_at: string | null
  created_at: string
}

export type MessageRequestStatus = 'pending' | 'accepted' | 'declined' | 'blocked'

export interface MessageRequest {
  id: string
  sender_id: string
  receiver_id: string
  source_post_id: string | null
  message_text: string
  status: MessageRequestStatus
  created_at: string
  updated_at: string
}

export type DatingProfileWithPhotos = DatingProfile & {
  photos: ProfilePhoto[]
  compatibility_preview?: {
    label: 'low' | 'moderate' | 'strong'
    reason: string
    confidence: number
  }
}

export type DatingMatchWithProfile = DatingMatch & {
  other_profile: DatingProfileWithPhotos | null
}

export const STAGES: { id: Stage; label: string; emoji: string; emptyMessage: string }[] = [
  { id: 'orbiting', label: 'Orbiting', emoji: '👀', emptyMessage: 'No lurkers detected. Yet.' },
  { id: 'talking', label: 'Talking Stage', emoji: '💬', emptyMessage: 'Silence. Must be nice.' },
  { id: 'situationship', label: 'Situationship', emoji: '🔥', emptyMessage: 'No chaos. Suspicious.' },
  { id: 'dating', label: 'Dating', emoji: '💕', emptyMessage: 'The pipeline is dry. Touch grass.' },
  { id: 'no_contact', label: 'No Contact', emoji: '🛡️', emptyMessage: 'No exes in recovery mode.' },
  { id: 'ghosted', label: 'Ghosted Me', emoji: '👻', emptyMessage: 'Blissfully ghost-free. For now.' },
  { id: 'red_flag_hold', label: 'Red Flag Hold', emoji: '🚩', emptyMessage: 'All clear. For now.' },
  { id: 'archived', label: 'Archived', emoji: '💀', emptyMessage: 'The graveyard is empty. Lucky you.' },
]

export const STAGE_COLORS: Record<Stage, string> = {
  orbiting: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  talking: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  situationship: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  dating: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  no_contact: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  ghosted: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  red_flag_hold: 'bg-red-500/20 text-red-300 border-red-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export const VIBE_COLORS: Record<Vibe, string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
  dead: '#71717a',
}
