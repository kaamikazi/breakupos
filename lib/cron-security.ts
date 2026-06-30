export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string; code: 'missing_secret' | 'unauthorized' }

export function authorizeCronRequest(input: { configuredSecret?: string | null; authorization?: string | null }): CronAuthResult {
  const secret = input.configuredSecret?.trim()
  if (!secret) {
    return { ok: false, status: 503, message: 'Cron endpoint is not configured.', code: 'missing_secret' }
  }

  if (input.authorization !== `Bearer ${secret}`) {
    return { ok: false, status: 401, message: 'Unauthorized', code: 'unauthorized' }
  }

  return { ok: true }
}
