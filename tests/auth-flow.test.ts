import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildLoginRedirect,
  getOAuthLoginPath,
  getPostLoginRedirect,
  getProtectedRouteRedirect,
  isPublicAppPath,
  pathNeedsDatingProfile,
  sanitizeNextPath,
} from '@/lib/auth-flow'

const repoRoot = process.cwd()

describe('auth entry flow', () => {
  it('redirects protected logged-out paths to login with next preserved', () => {
    expect(isPublicAppPath('/social')).toBe(false)
    expect(buildLoginRedirect('/social', '?section=ghosted')).toBe('/login?next=%2Fsocial%3Fsection%3Dghosted')
  })

  it('sanitizes unsafe next redirects', () => {
    expect(sanitizeNextPath('https://evil.test')).toBe('/dashboard')
    expect(sanitizeNextPath('//evil.test')).toBe('/dashboard')
    expect(sanitizeNextPath('/login?next=/social')).toBe('/dashboard')
    expect(sanitizeNextPath('/social')).toBe('/social')
  })

  it('builds Google OAuth path with the intended destination', () => {
    expect(getOAuthLoginPath('google', '/social')).toBe('/auth/login?provider=google&next=%2Fsocial')
  })

  it('prioritizes beta gate before app redirects', () => {
    expect(getPostLoginRedirect({
      requestedNext: '/social',
      betaGateEnabled: true,
      betaApproved: false,
    })).toBe('/beta-access')

    expect(getPostLoginRedirect({
      requestedNext: '/social',
      betaGateEnabled: false,
      betaApproved: false,
    })).toBe('/social')
  })

  it('sends users needing setup to onboarding after beta approval', () => {
    expect(pathNeedsDatingProfile('/discover')).toBe(true)
    expect(pathNeedsDatingProfile('/matches/abc')).toBe(true)
    expect(pathNeedsDatingProfile('/social')).toBe(false)
    expect(getPostLoginRedirect({
      requestedNext: '/discover',
      betaGateEnabled: true,
      betaApproved: true,
      needsProfileSetup: true,
    })).toBe('/dating/onboarding')

    expect(getPostLoginRedirect({
      requestedNext: '/social',
      betaGateEnabled: true,
      betaApproved: true,
      needsOnboarding: true,
      needsProfileSetup: true,
    })).toBe('/onboarding')
  })

  it('keeps login and landing copy wired to the launch flow', () => {
    const authEntry = readFileSync(join(repoRoot, 'components/Auth/AuthEntryPage.tsx'), 'utf8')
    const authOptions = readFileSync(join(repoRoot, 'components/Auth/AuthOptions.tsx'), 'utf8')
    const landing = readFileSync(join(repoRoot, 'app/page.tsx'), 'utf8')
    const oauthRoute = readFileSync(join(repoRoot, 'app/auth/login/route.ts'), 'utf8')

    expect(authEntry).toContain('Welcome to Breakup OS')
    expect(authEntry).toContain('New here?')
    expect(authEntry).toContain('New users will create a free beta account automatically.')
    expect(authOptions).toContain('Continue with Google')
    expect(authOptions).toContain('Opening Google...')
    expect(landing).toContain('href="/login"')
    expect(landing).toContain('href="/login?next=/social"')
    expect(landing).toContain('href="/login?next=/analyzer"')
    expect(landing).toContain('Start free beta')
    expect(authEntry).not.toContain('signInWithOAuth')
    expect(oauthRoute).toContain('signInWithOAuth')
  })

  it('keeps onboarding guard from redirecting to itself', () => {
    expect(getProtectedRouteRedirect({
      pathname: '/social',
      search: '',
      authenticated: false,
      betaGateEnabled: false,
      betaApproved: false,
      onboarded: false,
    })).toBe('/login?next=%2Fsocial')

    expect(getProtectedRouteRedirect({
      pathname: '/social',
      search: '?tab=latest',
      authenticated: true,
      betaGateEnabled: false,
      betaApproved: true,
      onboarded: false,
    })).toBe('/onboarding?next=%2Fsocial%3Ftab%3Dlatest')

    expect(getProtectedRouteRedirect({
      pathname: '/onboarding',
      authenticated: true,
      betaGateEnabled: false,
      betaApproved: true,
      onboarded: false,
    })).toBeNull()

    expect(getProtectedRouteRedirect({
      pathname: '/onboarding',
      search: '?next=%2Fsocial',
      authenticated: true,
      betaGateEnabled: false,
      betaApproved: true,
      onboarded: true,
    })).toBe('/social')

    expect(getProtectedRouteRedirect({
      pathname: '/onboarding',
      search: '?next=%2Fonboarding',
      authenticated: true,
      betaGateEnabled: false,
      betaApproved: false,
      onboarded: true,
    })).toBe('/social')
  })

  it('does not block auth callback with beta or onboarding guards', () => {
    expect(getProtectedRouteRedirect({
      pathname: '/auth/callback',
      search: '?code=abc',
      authenticated: true,
      betaGateEnabled: true,
      betaApproved: false,
      onboarded: false,
    })).toBeNull()
  })
})
