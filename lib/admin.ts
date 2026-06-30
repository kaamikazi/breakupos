export function parseAdminEmails(value = process.env.ADMIN_EMAILS ?? '') {
  return value
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(
  email: string | null | undefined,
  adminEmails = parseAdminEmails(),
  verification?: { emailConfirmedAt?: string | null; emailVerified?: boolean | null }
) {
  if (!email || adminEmails.length === 0 || !adminEmails.includes(email.toLowerCase())) return false
  if (!verification) return true
  return Boolean(verification.emailConfirmedAt || verification.emailVerified)
}
