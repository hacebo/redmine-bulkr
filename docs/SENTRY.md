# Sentry Integration

This project uses [Sentry](https://sentry.io) for error tracking and performance monitoring in production.

## Features

- Error tracking across client, server, and edge runtime
- Performance monitoring (traces and transactions)
- User context for better error debugging
- Source maps for readable stack traces
- Breadcrumbs for understanding error flow

## Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Create an account (free tier: 5,000 errors/month, 10,000 performance units/month)
3. Create a new project (select Next.js)

### 2. Install Sentry (Already Done)

The Sentry SDK is already installed and configured:

```bash
pnpm add @sentry/nextjs
```

### 3. Environment Variables

Add to your `.env.local` file:

```env
# Sentry - Error tracking and performance monitoring
# Get from: https://sentry.io/settings/account/api/auth-tokens/
# Create a token with "project:releases" and "project:write" scopes
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Sentry - Console log levels to capture (comma-separated)
# Options: log, info, warn, error, debug
# Default: error (recommended for production)
SENTRY_LOG_LEVELS=error
NEXT_PUBLIC_SENTRY_LOG_LEVELS=error
```

### 4. Configuration Files

The following files are auto-configured by Sentry:

- `sentry.client.config.ts` - Browser/client-side errors
- `sentry.server.config.ts` - Node.js server errors
- `sentry.edge.config.ts` - Edge runtime errors (middleware)
- `instrumentation.ts` - Sentry initialization
- `next.config.ts` - Webpack plugin for source maps

## Usage

### Automatic Error Tracking

Errors are automatically captured in:

- React components (via Error Boundaries)
- Server actions
- API routes
- Middleware

### Manual Error Logging

Use the `logError` utility for manual error tracking:

```typescript
import { logError } from '@/lib/sentry'

try {
  // Your code
} catch (error) {
  logError(error, {
    tags: {
      feature: 'time-entry',
      action: 'create',
    },
    extra: {
      projectId: '123',
      userId: 'user-456',
    },
    level: 'error', // 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  })
  throw error
}
```

### User Context

User context is automatically set when users authenticate and cleared on logout:

```typescript
// Automatic in requireUserForPage() and requireUserForServer()
setUserContext({ id: userId, email: userEmail })

// Clear on logout (automatic)
clearUserContext()
```

### Breadcrumbs

Add breadcrumbs for debugging flow:

```typescript
import { addBreadcrumb } from '@/lib/sentry'

addBreadcrumb('User clicked submit button', { formData: { ... } })
// Later if an error occurs, this breadcrumb will show in Sentry
```

## What Gets Tracked

### Client-Side
- React component errors
- Unhandled promise rejections
- Client-side API call failures
- User interactions leading to errors

### Server-Side
- Server action errors
- API route errors
- Database query errors
- External API call failures (Redmine, Appwrite)

### Edge Runtime
- Middleware errors
- Edge API route errors

## Configuration

### Sample Rates

Current configuration (`tracesSampleRate: 1`):
- Development: 100% of transactions tracked
- Production: Consider reducing to 0.1 (10%) to stay within free tier limits

Update in `sentry.*.config.ts` files:

```typescript
Sentry.init({
  // ... other config
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
})
```

### Console Log Levels

Configure which console methods are captured by Sentry:

**Production (default):**
```env
SENTRY_LOG_LEVELS=error
NEXT_PUBLIC_SENTRY_LOG_LEVELS=error
```

**Debugging (more verbose):**
```env
SENTRY_LOG_LEVELS=error,warn,info
NEXT_PUBLIC_SENTRY_LOG_LEVELS=error,warn,info
```

**Note:** More log levels = faster quota consumption. Use `error` only in production to stay within free tier.

### Environments

Sentry automatically detects:
- `development` - Local development
- `production` - Production deployment
- `preview` - Vercel preview deployments

### Source Maps

Source maps are automatically uploaded during build on Vercel. The `SENTRY_AUTH_TOKEN` environment variable must be set in Vercel for this to work.

## Monitoring

### Dashboard

Access your Sentry dashboard:
- https://sentry.io/organizations/your-org/issues/

### Key Metrics

Monitor these in Sentry:
- Error rate and trends
- Most common errors
- Performance metrics (p75, p95, p99)
- User impact (affected users)

### Alerts

Set up alerts in Sentry:
1. Go to Alerts → Create Alert
2. Configure conditions (e.g., "Error rate increases by 50%")
3. Set notification channels (email, Slack, etc.)

## Best Practices

### DO

- Use `logError` for expected errors that need tracking
- Add relevant tags and context to errors
- Set user context for authenticated users
- Add breadcrumbs for complex flows
- Monitor Sentry dashboard regularly

### DON'T

- Log sensitive data (passwords, tokens, credit cards)
- Over-sample in production (stay within free tier)
- Ignore repeated errors (they indicate real issues)
- Log expected validation errors (e.g., form validation)

## Troubleshooting

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set in Vercel
2. Check build logs for source map upload errors
3. Ensure `.sentryclirc` is not in `.gitignore`

### Errors Not Appearing

1. Check Sentry DSN is correct in config files
2. Verify environment is not in `beforeSend` filter
3. Check browser console for Sentry SDK errors
4. Ensure `instrumentation.ts` is being loaded

### Too Many Events

1. Reduce `tracesSampleRate` in production
2. Use `beforeSend` to filter out noise
3. Add `ignoreErrors` for known issues

## Cost Management

### Free Tier Limits

- 5,000 errors/month
- 10,000 performance units/month

### Staying Within Limits

1. Set lower sample rates in production
2. Filter out expected errors
3. Use rate limiting for noisy errors
4. Monitor usage in Sentry dashboard

### Upgrading

If you exceed free tier:
- Developer plan: $26/month (50k errors, 100k performance units)
- Team plan: $80/month (100k errors, 500k performance units)

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Monitoring Best Practices](https://docs.sentry.io/product/best-practices/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

