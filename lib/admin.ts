export function parseAdminEmails(value = process.env.ADMIN_EMAILS ?? '') {
  return value
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined, adminEmails = parseAdminEmails()) {
  return Boolean(email && adminEmails.includes(email.toLowerCase()))
}
