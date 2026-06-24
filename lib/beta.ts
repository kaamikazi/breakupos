export const BETA_ACCESS_COOKIE = 'breakupos_beta_access'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function isBetaAccessEnabled(env: NodeJS.ProcessEnv = process.env) {
  const configured =
    env.BETA_GATE_ENABLED ??
    env.NEXT_PUBLIC_BETA_GATE_ENABLED ??
    env.BETA_ACCESS_ENABLED

  return TRUE_VALUES.has((configured ?? '').trim().toLowerCase())
}

export function hasBetaPasswordConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean((env.BETA_ACCESS_CODE ?? '').trim())
}

export function hasValidBetaAccessCode(code: string, env: NodeJS.ProcessEnv = process.env) {
  const expected = env.BETA_ACCESS_CODE
  return Boolean(expected) && code.trim() === expected
}

export function isBetaApproved(profile: { beta_approved_at?: string | null } | null | undefined) {
  return Boolean(profile?.beta_approved_at)
}

export function canAccessBetaApp(input: {
  gateEnabled: boolean
  profile?: { beta_approved_at?: string | null } | null
}) {
  return !input.gateEnabled || isBetaApproved(input.profile)
}
