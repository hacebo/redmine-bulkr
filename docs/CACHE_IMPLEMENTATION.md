# Cache Implementation

## Overview

This document describes the caching strategy implemented in the Redmine-Bulkr application using Next.js `unstable_cache` with proper user-scoping and cache invalidation.

## Architecture

### User-Scoped Caching

All cached data is scoped by:
1. **User ID** - Ensures users don't see each other's data
2. **Base URL** - Supports multiple Redmine instances per user

### Cache Keys Pattern

```
{resource}:{userId}:{baseUrl}
```

Examples:
- `projects:user123:https://redmine.example.com`
- `activities:user456:https://redmine.internal.org`

### Cache Tags Pattern

```
{resource}:{userId}
```

Examples:
- `projects:user123`
- `activities:user456`
- `time-entries:user789`

Tags allow selective cache invalidation when data changes.

## Implementation

### Core Cache Utility (`app/lib/cache.ts`)

```typescript
export function createUserScopedCache<T>(
  fn: () => Promise<T>,
  keyPrefix: string,
  ctx: UserContext,
  options: {
    revalidate?: number;
    tagPrefix: string;
  }
): () => Promise<T>
```

**Key Features:**
- Accepts a raw fetch function (no params, gets credentials internally)
- Automatically scopes cache by userId and baseUrl
- Returns a cached version that can be called repeatedly
- TTL-based revalidation (stale data heals itself)
- Tag-based invalidation (for mutations)

### Cache Configuration

| Resource | TTL | Reason |
|----------|-----|--------|
| Projects | 10 minutes | Changes infrequently |
| Activities | 1 hour | Rarely changes |
| Time Entries | 1 minute | Frequently updated |

## Usage Pattern

### Reading Cached Data

```typescript
export async function getProjects(): Promise<Project[]> {
  const user = await getServerUser();
  const credentials = await getDecryptedRedmineCredentials();

  // Create a closure that captures credentials
  const fetchProjectsRaw = async () => {
    const client = new RedmineService(credentials.baseUrl, credentials.apiKey);
    const data = await client.getProjects();
    return data.projects.map(/* transform */);
  };

  // Create cached version
  const getProjectsCached = createUserScopedCache(
    fetchProjectsRaw,
    'projects',
    { userId: user.$id, baseUrl: credentials.baseUrl },
    {
      revalidate: CACHE_CONFIG.PROJECTS.revalidate,
      tagPrefix: CACHE_CONFIG.PROJECTS.tagPrefix,
    }
  );

  return await getProjectsCached();
}
```

### Invalidating Cache on Mutations

When data changes, invalidate the relevant cache tags:

```typescript
import { revalidateTag } from 'next/cache';

// After creating time entries
revalidateTag(`time-entries:${userId}`);

// After updating credentials (invalidate everything)
revalidateTag(`projects:${userId}`);
revalidateTag(`activities:${userId}`);
revalidateTag(`time-entries:${userId}`);
```

## Current Cache Invalidation Points

1. **Save Redmine Credentials** (`app/(protected)/settings/redmine/actions.ts`)
   - Invalidates: `projects`, `activities`, `time-entries`
   - Reason: New credentials might point to different Redmine instance

2. **Create Time Entries** (`app/lib/actions/time-entries.ts`)
   - Invalidates: `time-entries`
   - Reason: New data was added

## Security Considerations

1. **No Secrets in Cache Keys**
   - API keys are NOT included in cache keys
   - Credentials are captured in closures, not passed as parameters

2. **User Isolation**
   - Each user's cache is completely isolated
   - Cache keys include userId to prevent cross-user leaks

3. **Server-Side Only**
   - All cache utilities are server-side only
   - Client components call server actions (React 19 pattern)
   - No direct API calls from client

## Client/Server Boundaries

### Server Components ✅
- `app/(protected)/**/page.tsx` - Can call server actions directly
- Import and call `getProjects()`, `getActivities()`, etc.

### Client Components ✅
- `components/**/*.tsx` - Can call server actions
- Import and call server actions from `useEffect`, event handlers, etc.
- Uses React 19's built-in support for server actions

### Server Actions ✅
- `app/lib/actions/*.ts` - Always marked with `'use server'`
- Use cache utilities internally
- Return plain serializable data (no functions, classes, etc.)

## Non-Durable Cache Notice

`unstable_cache` is **not durable**:
- Cache is cleared on deploys
- Cache is cleared on region cold starts
- Cache is in-memory only

This is acceptable for:
- Reducing redundant API calls within a session
- Improving response times for frequently-accessed data
- Automatic healing via TTL

For stronger guarantees (global, persistent cache):
- Add Redis/KV layer
- Keep the same tags/keys scheme
- Drop-in replacement for `unstable_cache`

## Future Enhancements

1. **Redis Integration**
   - Replace `unstable_cache` with Redis
   - Keep same API surface
   - Add durability and cross-region support

2. **Additional Invalidation Points**
   - Update time entry → invalidate cache
   - Delete time entry → invalidate cache
   - Update project settings → invalidate cache

3. **Cache Warming**
   - Pre-populate cache for common queries
   - Background refresh before TTL expires

4. **Metrics**
   - Track cache hit/miss rates
   - Monitor cache size
   - Alert on high miss rates

## Testing Cache Behavior

### Verify User Isolation
1. Login as User A
2. View projects (should see User A's data)
3. Login as User B (different browser/incognito)
4. View projects (should see User B's data, not User A's)

### Verify Invalidation
1. Create a time entry
2. Refresh the page
3. Should see the new entry immediately (cache was invalidated)

### Verify TTL
1. View projects
2. Wait 10+ minutes (or modify revalidate time for testing)
3. Projects should refresh automatically

## Troubleshooting

### Data Not Updating
- Check if cache invalidation is called after mutations
- Verify the correct tags are being invalidated
- Check the TTL hasn't been set too high

### Cross-User Data Leakage
- Verify userId is included in cache keys
- Check that credentials are not being shared across users
- Review server action authentication

### Performance Issues
- Monitor cache hit rates
- Check if TTL is too short (causing excessive API calls)
- Consider adding more aggressive caching for rarely-changed data

