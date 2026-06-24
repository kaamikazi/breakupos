type LogContext = Record<string, string | number | boolean | null | undefined>

const SAFE_KEY_PATTERN = /^(route|event|userId|status|code|operation|step|table|bucket|errorMessage|subscriptionId|customerId|invoiceId)$/i

function sanitizeContext(context: LogContext = {}) {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => SAFE_KEY_PATTERN.test(key))
  )
}

export function logServerError(message: string, context?: LogContext) {
  // TODO: forward sanitized errors to Sentry, Axiom, or another monitoring provider.
  console.error(`[BreakupOS] ${message}`, sanitizeContext(context))
}

export function logServerInfo(message: string, context?: LogContext) {
  console.info(`[BreakupOS] ${message}`, sanitizeContext(context))
}
