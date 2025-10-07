'use server';

import { requireUserForServer } from '@/lib/auth.server';
import { createAdminClient, APPWRITE_DATABASE_ID, REDMINE_CREDENTIALS_COLLECTION_ID } from '@/lib/appwrite';
import { encryptToGcm, decryptFromGcm } from '@/lib/crypto';
import { ID, Query } from 'node-appwrite';
import { RedmineService } from '@/app/lib/services/redmine';
import { logError } from '@/lib/sentry';

export interface RedmineCredentials {
  $id?: string;
  userId: string;
  baseUrl: string;
  apiKeyEnc: string;
  iv: string;
  tag: string;
  redmineUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RedmineCredentialsInput {
  baseUrl: string;
  apiKey: string;
}

/**
 * Get Redmine credentials for current user (server-side read using admin API key)
 * Used by SSR pages that need to check if user has configured credentials
 * Returns null if user not authenticated or credentials not found
 */
export async function getRedmineCredentialsServer(): Promise<RedmineCredentials | null> {
  try {
    const user = await requireUserForServer();

    // Use admin client for server-side reads
    const { databases } = createAdminClient();
    
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      [Query.equal("userId", user.userId)]
    );

    if (response.documents.length === 0) {
      return null;
    }

    const doc = response.documents[0];
    return {
      $id: doc.$id,
      userId: doc.userId,
      baseUrl: doc.baseUrl,
      apiKeyEnc: doc.apiKeyEnc,
      iv: doc.iv,
      tag: doc.tag,
      redmineUserId: doc.redmineUserId,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    } as RedmineCredentials;
  } catch (error) {
    // During logout or auth transitions, this might be called without valid auth
    // Return null gracefully - the layout/middleware will handle redirect
    if (error instanceof Error && error.message === 'unauthorized') {
      return null;
    }
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials-server',
        errorType: 'get_failed',
      },
      level: 'warning',
    });
    return null;
  }
}

/**
 * Get decrypted Redmine credentials (server-side read)
 * Used by server actions that need to call Redmine API
 * Returns null if user not authenticated or credentials not found
 */
export async function getDecryptedRedmineCredentialsServer() {
  try {
    const credentials = await getRedmineCredentialsServer();
    if (!credentials) {
      return null;
    }

    // Decrypt the API key
    const apiKey = decryptFromGcm(credentials.apiKeyEnc, credentials.iv, credentials.tag);

    return {
      baseUrl: credentials.baseUrl,
      apiKey,
      redmineUserId: credentials.redmineUserId,
    };
  } catch (error) {
    // Gracefully handle auth errors during transitions
    if (error instanceof Error && error.message === 'unauthorized') {
      return null;
    }
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials-server',
        errorType: 'decrypt_failed',
      },
    });
    return null;
  }
}

/**
 * Save Redmine credentials (write operation - uses admin API key)
 * Note: Using admin client because cross-domain prevents user session cookies
 * Security: Still user-scoped via userId in data and permissions
 */
export async function saveRedmineCredentialsServer(credentials: RedmineCredentialsInput) {
  try {
    const user = await requireUserForServer();

    // Encrypt the API key
    const { encB64, ivB64, tagB64 } = encryptToGcm(credentials.apiKey);

    // Get the Redmine user ID by making a test API call (required)
    const tempClient = new RedmineService(credentials.baseUrl, credentials.apiKey);
    const currentUser = await tempClient.getCurrentUser();
    const redmineUserId = currentUser.user.id.toString();

    const credentialsData: Omit<RedmineCredentials, '$id' | 'createdAt' | 'updatedAt'> = {
      userId: user.userId,
      baseUrl: credentials.baseUrl,
      apiKeyEnc: encB64,
      iv: ivB64,
      tag: tagB64,
      redmineUserId,
    };

    // Check if credentials already exist for this user
    const existingCredentials = await getRedmineCredentialsServer();
    const { databases } = createAdminClient();
    
    if (existingCredentials) {
      // Update existing credentials
      const result = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        existingCredentials.$id!,
        credentialsData
      );
      
      return { success: true, credentials: result };
    } else {
      // Create new credentials
      // Note: Using admin client, so we can't set user-specific permissions
      // Security: Data is user-scoped via userId field + collection-level permissions
      const result = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        ID.unique(),
        credentialsData
      );
      
      return { success: true, credentials: result };
    }
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials-server',
        errorType: 'save_failed',
      },
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to save Redmine credentials. Please try again.';
    return {
      success: false,
      error: errorMessage
    };
  }
}
