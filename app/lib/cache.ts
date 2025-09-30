// Wrapper around Next.js unstable_cache for consistent caching interface
// This abstraction allows us to switch implementations (Redis, etc.) in the future

import { unstable_cache } from 'next/cache';

interface CacheOptions {
  revalidate?: number; // Time in seconds
  tags?: string[]; // Cache tags for selective invalidation
}

/**
 * Creates a cached version of an async function using Next.js built-in cache
 * @param fn - The async function to cache
 * @param keys - Cache key parts (will be combined into a single key)
 * @param options - Cache options (revalidate time and tags)
 * @returns A cached version of the function
 */
export function cachedFn<T>(
  fn: () => Promise<T>,
  keys: string[],
  options: CacheOptions = {}
): () => Promise<T> {
  const { revalidate = 300, tags = [] } = options; // Default 5 minutes
  
  return unstable_cache(fn, keys, {
    revalidate,
    tags,
  });
}

// Cache configuration constants
export const CACHE_CONFIG = {
  PROJECTS: {
    revalidate: 600, // 10 minutes
    tags: ['projects'],
  },
  ACTIVITIES: {
    revalidate: 1800, // 30 minutes
    tags: ['activities'],
  },
  TIME_ENTRIES: {
    revalidate: 60, // 1 minute
    tags: ['time-entries'],
  },
} as const;
