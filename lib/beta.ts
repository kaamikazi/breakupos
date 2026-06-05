export function isBetaAccessEnabled() {
  return process.env.BETA_ACCESS_ENABLED === 'true'
}

export function hasValidBetaAccessCode(code: string) {
  const expected = process.env.BETA_ACCESS_CODE
  return Boolean(expected) && code.trim() === expected
}

export const BETA_ACCESS_COOKIE = 'breakupos_beta_access'
