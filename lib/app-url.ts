import type { NextRequest } from 'next/server'

export function getAppUrl(req?: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')

  if (configuredUrl?.startsWith('http')) {
    return configuredUrl
  }

  if (req) {
    const forwardedProto = req.headers.get('x-forwarded-proto')
    const forwardedHost = req.headers.get('x-forwarded-host')
    const host = forwardedHost ?? req.headers.get('host')

    if (host) {
      return `${forwardedProto ?? 'http'}://${host}`.replace(/\/$/, '')
    }

    return new URL(req.url).origin
  }

  return 'http://localhost:3000'
}
