import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

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

export function rateLimit(key: string, limit: number, windowMs: number) {
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

export function getClientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
