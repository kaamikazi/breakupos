import { createServiceClient } from '@/lib/supabase-server'

export const CREDIT_COSTS = {
  basic_ai_advice: 1,
  message_analysis: 3,
  screenshot_chat_analysis: 5,
  red_flag_report: 10,
  relationship_report: 10,
  recovery_plan_30_day: 20,
  dating_readiness_score: 5,
  dating_profile_rewrite: 5,
  should_i_reply: 3,
  weekly_healing_report: 10,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

export function getCreditCost(action: CreditAction) {
  return CREDIT_COSTS[action]
}

export function canAffordCredits(balance: number | null | undefined, action: CreditAction) {
  return (balance ?? 0) >= getCreditCost(action)
}

export function aiActionForAdvisor(input: { mode: string; advice_type: string }): CreditAction {
  if (input.mode === 'analyze_message' || input.advice_type === 'message_analysis') return 'message_analysis'
  if (input.mode === 'draft_reply') return 'should_i_reply'
  if (input.advice_type === 'red_flag_analysis') return 'red_flag_report'
  return 'basic_ai_advice'
}

export async function ensureCreditWallet(userId: string) {
  const supabase = createServiceClient() as unknown as CreditTableClient
  const { data } = await supabase
    .from('user_credits')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('*')
    .single()
  return data
}

export async function getCreditBalance(userId: string) {
  const wallet = await ensureCreditWallet(userId)
  return wallet?.balance ?? 0
}

export async function spendCredits(input: {
  userId: string
  action: CreditAction
  referenceId?: string | null
}) {
  const amount = getCreditCost(input.action)
  const supabase = createServiceClient() as unknown as {
    rpc: (
      fn: 'spend_user_credits',
      args: { p_user_id: string; p_amount: number; p_reason: string; p_reference_id?: string | null }
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>
  }

  const { data, error } = await supabase.rpc('spend_user_credits', {
    p_user_id: input.userId,
    p_amount: amount,
    p_reason: input.action,
    p_reference_id: input.referenceId ?? null,
  })

  if (error) return { ok: false, error: error.message, amount }
  return { ok: data === true, error: data === true ? null : 'Insufficient credits', amount }
}

export async function refundCredits(input: {
  userId: string
  action: CreditAction
  amount?: number
  referenceId?: string | null
}) {
  const amount = input.amount ?? getCreditCost(input.action)
  const supabase = createServiceClient() as unknown as {
    rpc: (
      fn: 'refund_user_credits',
      args: { p_user_id: string; p_amount: number; p_reason: string; p_reference_id?: string | null }
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>
  }

  const { data, error } = await supabase.rpc('refund_user_credits', {
    p_user_id: input.userId,
    p_amount: amount,
    p_reason: `${input.action}_refund`,
    p_reference_id: input.referenceId ?? null,
  })

  if (error) return { ok: false, error: error.message, amount }
  return { ok: data === true, error: data === true ? null : 'Refund failed', amount }
}

export async function recordAIUsageEvent(input: {
  userId: string
  action: CreditAction
  status: 'started' | 'succeeded' | 'failed' | 'blocked'
  creditsCharged?: number
  referenceId?: string | null
}) {
  const supabase = createServiceClient() as unknown as CreditTableClient
  await supabase.from('ai_usage_events').insert({
    user_id: input.userId,
    action: input.action,
    status: input.status,
    credits_charged: input.creditsCharged ?? 0,
    reference_id: input.referenceId ?? null,
  })
}

type CreditTableClient = {
  from(table: 'user_credits'): {
    upsert: (
      values: { user_id: string },
      options: { onConflict: string; ignoreDuplicates: boolean }
    ) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { user_id: string; balance: number } | null }>
      }
    }
  }
  from(table: 'ai_usage_events'): {
    insert: (values: {
      user_id: string
      action: string
      status: string
      credits_charged: number
      reference_id: string | null
    }) => Promise<unknown>
  }
}
