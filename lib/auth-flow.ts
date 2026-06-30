export const LOGIN_PATH = '/login'
export const DEFAULT_POST_LOGIN_PATH = '/dashboard'

const PUBLIC_PATHS = [
  '/',
  LOGIN_PATH,
  '/onboarding',
  '/auth',
  '/api/beta',
  '/api/og',
  '/api/webhooks/stripe',
  '/api/cron/reset-quotas',
  '/manifest.webmanifest',
  '/pricing',
  '/privacy',
  '/safety',
]

export function isApiPath(pathname: string) {
  return pathname === '/api' || pathname.startsWith('/api/')
}

export function sanitizeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return DEFAULT_POST_LOGIN_PATH
  if (next.startsWith('/login') || next.startsWith('/auth/login')) return DEFAULT_POST_LOGIN_PATH
  return next
}

export function isPublicAppPath(pathname: string) {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

export function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/')
}

export function isBetaPublicPath(pathname: string) {
  const betaPublicPaths = [
    '/',
    LOGIN_PATH,
    '/auth',
    '/api/beta',
    '/api/og',
    '/manifest.webmanifest',
    '/privacy',
    '/safety',
  ]
  return pathname === '/beta-access' || betaPublicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

export function buildLoginRedirect(pathname: string, search = '') {
  const next = sanitizeNextPath(`${pathname}${search}`)
  return `${LOGIN_PATH}?next=${encodeURIComponent(next)}`
}

export function getOAuthLoginPath(provider: 'google' | 'github', next?: string | null) {
  return `/auth/login?provider=${provider}&next=${encodeURIComponent(sanitizeNextPath(next))}`
}

export function getPostLoginRedirect(input: {
  requestedNext?: string | null
  betaGateEnabled: boolean
  betaApproved: boolean
  needsOnboarding?: boolean
  needsProfileSetup?: boolean
}) {
  if (input.betaGateEnabled && !input.betaApproved) return '/beta-access'
  if (input.needsOnboarding) return '/onboarding'
  if (input.needsProfileSetup) return '/dating/onboarding'
  return sanitizeNextPath(input.requestedNext)
}

export function getProtectedRouteRedirect(input: {
  pathname: string
  search?: string
  authenticated: boolean
  betaGateEnabled: boolean
  betaApproved: boolean
  onboarded: boolean
}) {
  const search = input.search ?? ''
  const canEnterApp = !input.betaGateEnabled || input.betaApproved

  // API routes return JSON auth errors from the route handler itself. Avoid
  // middleware redirects that would turn an API 401 into a login HTML response.
  if (isApiPath(input.pathname)) return null

  if (!input.authenticated && !isPublicAppPath(input.pathname)) {
    return buildLoginRedirect(input.pathname, search)
  }

  if (!input.authenticated) return null

  if (input.betaGateEnabled && !input.betaApproved && !isBetaPublicPath(input.pathname)) {
    return '/beta-access'
  }

  if (canEnterApp && input.pathname === '/beta-access') {
    return input.onboarded ? '/dashboard' : '/onboarding'
  }

  if (canEnterApp && !input.onboarded && !isPublicAppPath(input.pathname) && !isOnboardingPath(input.pathname)) {
    const next = sanitizeNextPath(`${input.pathname}${search}`)
    return `/onboarding?next=${encodeURIComponent(next)}`
  }

  if (canEnterApp && input.onboarded && isOnboardingPath(input.pathname)) {
    const params = new URLSearchParams(search.replace(/^\?/, ''))
    const next = sanitizeNextPath(params.get('next') ?? '/social')
    return isOnboardingPath(next) ? '/social' : next
  }

  return null
}

export function pathNeedsDatingProfile(pathname: string | null | undefined) {
  const safePath = sanitizeNextPath(pathname)
  return safePath === '/discover' || safePath.startsWith('/discover/') || safePath === '/matches' || safePath.startsWith('/matches/')
}
