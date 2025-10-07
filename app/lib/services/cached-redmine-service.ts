'use server';

import { requireUserForServer } from '@/lib/auth.server';
import { getDecryptedRedmineCredentialsServer } from '@/lib/services/redmine-credentials-server';
import { RedmineService } from '../services/redmine';
import { RedmineApiError } from '../types';
import { createUserScopedCache } from '../cache';
import { logError } from '@/lib/sentry';

/**
 * Helper to create cached Redmine API calls
 * Handles auth, credentials, caching, and error handling in one place
 */
export async function createCachedRedmineCall<T>(
  cacheKey: string,
  fetchFn: (service: RedmineService) => Promise<T>,
  options: {
    revalidate: number;
    tagPrefix: string;
  }
): Promise<T> {
  // 1. Get user and credentials (happens OUTSIDE cache)
  const user = await requireUserForServer();

  const credentials = await getDecryptedRedmineCredentialsServer();
  if (!credentials) {
    throw new Error('No Redmine credentials found');
  }

  // Extract only what we need for the closure (principle of least privilege)
  const { baseUrl, apiKey } = credentials;

  try {
    // 2. Create closure that captures only baseUrl and apiKey (no dynamic data inside)
    const fetchRaw = async () => {
      const redmineService = new RedmineService(baseUrl, apiKey);
      return await fetchFn(redmineService);
    };

    // 3. Create cached version
    const getCached = createUserScopedCache(
      fetchRaw,
      cacheKey,
      { userId: user.userId, baseUrl },
      options
    );

    return await getCached();
  } catch (error) {
    // Log to Sentry with context
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        cacheKey,
        userId: user.userId,
        errorType: 'cached_redmine_call',
      },
      extra: {
        baseUrl,
      },
    });
    
    // 4. Handle Redmine-specific errors
    if (error instanceof RedmineApiError) {
      if (error.code === 'UNAUTHORIZED') {
        throw new Error('Your Redmine API key is invalid or expired. Please update your credentials in Settings.');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Unable to connect to Redmine. Please check your internet connection and try again.');
      }
      throw new Error(`Redmine error: ${error.message}`);
    }
    
    throw error;
  }
}

