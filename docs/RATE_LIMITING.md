# Rate Limiting and Cooldowns for Magic Links

This document describes the rate limiting system implemented to protect the magic link authentication endpoint from abuse.

## Overview

The application uses **Vercel KV** (Upstash Redis) to implement server-side rate limiting for magic link requests. This prevents:
- Spam and abuse of the email sending system
- Rapid successive requests from the same email
- Excessive API calls that could impact service availability

## Features

### Short-term Cooldown
- **Duration**: 90 seconds between requests
- **Purpose**: Prevents accidental duplicate requests and reduces load on email delivery
- **User Experience**: Button shows countdown timer ("Wait 60s") during cooldown

### Hourly Rate Limit
- **Limit**: 3 magic link requests per hour per email address
- **Purpose**: Prevents sustained abuse and protects against automated attacks
- **User Experience**: Clear error message with retry time in minutes

### Reset on Successful Authentication
- **Behavior**: Rate limiting counters are cleared after successful magic link authentication
- **Purpose**: Gives legitimate users a fresh start after proving their identity
- **Implementation**: Automatically resets when user successfully signs in via magic link

### Privacy Protection
- Email addresses are hashed using HMAC-SHA256 before being used as Redis keys
- No plaintext email addresses are stored in Redis
- Uses a secret key for hashing (REDIS_HASH_SECRET)

## Architecture

### Components

1. **lib/redis.ts**
   - Creates and exports a Redis client using Vercel KV credentials
   - Validates required environment variables

2. **lib/services/rate-limit.ts**
   - Core rate limiting logic
   - `checkMagicLinkRateLimit()`: Validates if a request is allowed
   - `setMagicLinkCooldown()`: Sets the cooldown period after successful send
   - Email hashing for privacy

3. **lib/services/auth.ts**
   - Updated `sendMagicLink()` function integrates rate limiting
   - Returns cooldown/retry information to the UI
   - Graceful error handling

4. **components/forms/magic-link-form.tsx**
   - Client-side countdown timer
   - Disabled state during cooldown
   - User-friendly button text ("Wait Xs")

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Vercel KV (Upstash Redis)
# Get these from: https://vercel.com/dashboard/stores
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token

# Redis Hash Secret
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
REDIS_HASH_SECRET=your-redis-hash-secret
```

### Setting Up Vercel KV

1. **Create a KV Database**
   - Go to [Vercel Dashboard > Storage](https://vercel.com/dashboard/stores)
   - Click "Create Database"
   - Select "KV" (powered by Upstash Redis)
   - Choose a name and region
   - Click "Create"

2. **Get Credentials**
   - After creation, go to the `.env.local` tab
   - Copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`
   - Add them to your local `.env.local` file

3. **Generate Hash Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and add as `REDIS_HASH_SECRET` to your `.env.local` file

4. **For Vercel Deployment**
   - Environment variables are automatically synced to your project
   - No additional configuration needed

## Customization

To adjust rate limiting parameters, edit `lib/services/rate-limit.ts`:

```typescript
const EMAIL_WINDOW = 60 * 60;   // 1 hour (in seconds)
const EMAIL_MAX = 3;            // Maximum requests per window
const EMAIL_COOLDOWN = 90;      // Cooldown between requests (in seconds)
```

## Error Handling

The system is designed to fail open - if Redis is unavailable, requests will be allowed to proceed. This ensures the authentication system remains available even if the rate limiting service is down.

Errors are logged to the console for monitoring:
```typescript
console.error("Rate limit check error:", error);
```

## Redis Key Structure

Keys are structured as follows:

- **Cooldown Keys**: `cd:email:{hashedEmail}`
  - TTL: 90 seconds
  - Value: "1" (simple flag)

- **Rate Limit Keys**: `rl:email:{hashedEmail}`
  - TTL: 3600 seconds (1 hour)
  - Value: Integer count of requests

## Testing

To test the rate limiting:

1. Request a magic link
2. Observe the 90-second cooldown timer
3. Request 3 magic links within an hour
4. The 4th request should be blocked with a rate limit message

## Monitoring

Monitor rate limiting in your Vercel KV dashboard:
- View key counts
- Check memory usage
- Review request patterns

## Security Considerations

1. **Email Privacy**: Emails are hashed before storage
2. **Secret Rotation**: Change `REDIS_HASH_SECRET` periodically (will reset all cooldowns)
3. **Fallback Strategy**: System fails open if Redis is unavailable
4. **No PII Storage**: Only hashed values are stored in Redis

## Future Enhancements

Potential improvements:
- IP-based rate limiting
- Dynamic cooldown periods based on abuse patterns
- Admin dashboard for rate limit monitoring
- Configurable limits per user tier

