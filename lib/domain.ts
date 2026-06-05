import type { AdviceType, ContactMethod, InteractionType, Stage, Vibe } from '@/types'

export const STAGE_VALUES = [
  'orbiting',
  'talking',
  'situationship',
  'dating',
  'no_contact',
  'ghosted',
  'red_flag_hold',
  'archived',
] as const satisfies readonly Stage[]

export const VIBE_VALUES = ['hot', 'warm', 'cold', 'dead'] as const satisfies readonly Vibe[]

export const CONTACT_METHOD_VALUES = [
  'instagram',
  'tinder',
  'hinge',
  'bumble',
  'irl',
  'twitter',
  'discord',
  'other',
] as const satisfies readonly ContactMethod[]

export const INTERACTION_TYPE_VALUES = [
  'message',
  'date',
  'call',
  'ghost',
  'breadcrumb',
  'left_on_read',
  'relapse',
  'boundary',
  'conflict',
  'repair',
  'stage_change',
] as const satisfies readonly InteractionType[]

export const ADVICE_TYPE_VALUES = [
  'general',
  'red_flag_analysis',
  'move_recommendation',
  'exit_strategy',
  'draft_reply',
  'message_analysis',
] as const satisfies readonly AdviceType[]

export const FIELD_LIMITS = {
  name: 100,
  note: 500,
  privateNotes: 5000,
  privateVault: 8000,
  flag: 120,
  reason: 180,
  milestone: 120,
  advisorQuestion: 1000,
  messageText: 8000,
  context: 1000,
} as const
