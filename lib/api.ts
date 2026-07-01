import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logServerWarning } from '@/lib/logging'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { limited: boolean; remaining: number }

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function parseJson<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return { data: null, error: NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }) }
    }
    return { data: parsed.data, error: null }
  } catch {
    return { data: null, error: jsonError('Invalid JSON body', 400) }
  }
}

/**
 * In-memory fixed-window limiter. Used as a fallback when Upstash is not
 * configured or is unreachable. Note: this is per-instance and resets on
 * serverless cold starts, so it is best-effort only.
 */
export function inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    return { limited: true, remaining: 0 }
  }

  existing.count += 1
  return { limited: false, remaining: limit - existing.count }
}

// --- Upstash Redis backed rate limiting (durable across serverless instances) ---

let redisClient: Redis | null = null
let redisResolved = false

function getRedis(): Redis | null {
  if (redisResolved) return redisClient
  redisResolved = true
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    redisClient = null
    return null
  }
  redisClient = new Redis({ url, token })
  return redisClient
}

export function isDurableRateLimitConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export function productionAiRateLimitGuard(route: string, userId?: string): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (isDurableRateLimitConfigured()) return null

  logServerWarning('Durable rate limiting is missing for an expensive AI route', {
    route,
    userId,
    code: 'missing_upstash_rate_limit',
  })
  return jsonError('AI features are temporarily unavailable while rate limiting is configured.', 503)
}

// Cache one Ratelimit instance per (limit, window) combination so we reuse
// connections instead of rebuilding the limiter on every request.
const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null

  const cacheKey = `${limit}:${windowMs}`
  const cached = limiterCache.get(cacheKey)
  if (cached) return cached

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: 'breakupos-rl',
    analytics: false,
  })
  limiterCache.set(cacheKey, limiter)
  return limiter
}

/**
 * Rate limit `key` to `limit` requests per `windowMs`.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set (durable and shared across all serverless instances). Falls back to
 * the in-memory limiter when Upstash is not configured or is unreachable.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowMs)
  if (limiter) {
    try {
      const { success, remaining } = await limiter.limit(key)
      return { limited: !success, remaining }
    } catch {
      // Upstash unreachable — degrade gracefully to in-memory so some limit still applies.
      return inMemoryRateLimit(key, limit, windowMs)
    }
  }
  return inMemoryRateLimit(key, limit, windowMs)
}

export function getClientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
