'use server';

import { getServerUser } from '@/lib/services/auth';
import { getDecryptedRedmineCredentials } from '@/lib/services/redmine-credentials';
import { RedmineService } from '../services/redmine';
import { RedmineApiError } from '../types';
import { createUserScopedCache } from '../cache';

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
  const user = await getServerUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const credentials = await getDecryptedRedmineCredentials();
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
      { userId: user.$id, baseUrl },
      options
    );

    return await getCached();
  } catch (error) {
    console.error(`Error in cached Redmine call (${cacheKey}):`, error);
    
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

