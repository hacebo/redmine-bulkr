// Wrapper around Next.js unstable_cache for user-scoped caching
// This abstraction allows us to switch implementations (Redis, etc.) in the future

import { unstable_cache } from 'next/cache';

export interface UserContext {
  userId: string;
  baseUrl: string;
}

/**
 * Creates a user-scoped cached function
 * Each user gets their own isolated cache based on userId and baseUrl
 * 
 * @param fn - The raw fetch function (receives no params, should get credentials internally)
 * @param keyPrefix - Prefix for the cache key (e.g., 'projects', 'activities')
 * @param ctx - User context for scoping
 * @param options - Cache options
 * @returns A cached version of the function
 */
export function createUserScopedCache<T>(
  fn: () => Promise<T>,
  keyPrefix: string,
  ctx: UserContext,
  options: {
    revalidate?: number;
    tagPrefix: string;
  }
): () => Promise<T> {
  const { revalidate = 300, tagPrefix } = options;
  
  // Scope cache by user and baseUrl so users don't see each other's data
  return unstable_cache(
    fn,
    [`${keyPrefix}:${ctx.userId}:${ctx.baseUrl}`],
    {
      revalidate,
      tags: [`${tagPrefix}:${ctx.userId}`],
    }
  );
}

// Cache configuration constants
export const CACHE_CONFIG = {
  PROJECTS: {
    revalidate: 60 * 10, // 10 minutes
    tagPrefix: 'projects',
  },
  ACTIVITIES: {
    revalidate: 60 * 60, // 1 hour (activities change rarely)
    tagPrefix: 'activities',
  },
  TIME_ENTRIES: {
    revalidate: 60, // 1 minute
    tagPrefix: 'time-entries',
  },
  ISSUES: {
    revalidate: 60 * 5, // 5 minutes
    tagPrefix: 'issues',
  },
} as const;
