import * as Sentry from '@sentry/nextjs'

/**
 * Enhanced error logging with Sentry
 * Captures errors with additional context for better debugging
 */
export function logError(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  }
) {
  const errorToCapture = error instanceof Error ? error : new Error(String(error))

  Sentry.captureException(errorToCapture, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
  })

  // Keep console.error for local development
  if (process.env.NODE_ENV === 'development') {
    console.error(errorToCapture, context)
  }
}

/**
 * Set user context for all subsequent error reports
 * Call this after user authentication
 */
export function setUserContext(user: {
  id: string
  email?: string
  username?: string
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for debugging flow
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
) {
  Sentry.addBreadcrumb({
    message,
    level: level || 'info',
    data,
  })
}

