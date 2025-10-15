'use server';

import { requireUserForServer } from '@/lib/auth.server';
import { createAdminClient, APPWRITE_DATABASE_ID, REDMINE_CREDENTIALS_COLLECTION_ID } from '@/lib/appwrite';
import { encryptToGcm, decryptFromGcm } from '@/lib/crypto';
import { ID, Query } from 'node-appwrite';
import { RedmineService } from '@/app/lib/services/redmine';
import { logError, addBreadcrumb } from '@/lib/sentry';

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
    
    addBreadcrumb('Fetching Redmine credentials', { userId: user.userId }, 'info');
    
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      [Query.equal("userId", user.userId)]
    );

    if (response.documents.length === 0) {
      addBreadcrumb('No Redmine credentials found', { 
        userId: user.userId,
        userEmail: user.email 
      }, 'info');
      return null;
    }

    const doc = response.documents[0];
    
    addBreadcrumb('Redmine credentials retrieved', {
      credentialId: doc.$id,
      baseUrl: doc.baseUrl,
      hasEncryptedKey: !!doc.apiKeyEnc,
    }, 'info');
    
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
    // Log to Sentry first, then handle specific cases
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isUnauthorized = error instanceof Error && error.message === 'unauthorized';
    
    // Only log actual errors to Sentry, not expected auth transitions
    if (!isUnauthorized) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        level: 'warning',
        tags: {
          service: 'redmine-credentials-server',
          errorType: 'get_failed',
        },
        extra: {
          errorMessage,
        },
      });
    } else {
      // Expected during logout - just add breadcrumb for context
      addBreadcrumb('Unauthorized access to credentials', { errorMessage }, 'info');
    }
    
    return null;
  }
}

/**
 * Get decrypted Redmine credentials (server-side read)
 * Used by server actions that need to call Redmine API
 * Returns null if user not authenticated or credentials not found
 * Throws error with specific message if decryption fails (key rotation/corruption)
 */
export async function getDecryptedRedmineCredentialsServer() {
  try {
    const credentials = await getRedmineCredentialsServer();
    if (!credentials) {
      return null;
    }

    // Decrypt the API key
    try {
      const apiKey = decryptFromGcm(credentials.apiKeyEnc, credentials.iv, credentials.tag);

      return {
        baseUrl: credentials.baseUrl,
        apiKey,
        redmineUserId: credentials.redmineUserId,
      };
    } catch (decryptError) {
      // Decryption failed - likely due to key rotation or corrupted data
      // Delete the corrupted credentials so user can re-save them
      logError(decryptError instanceof Error ? decryptError : new Error(String(decryptError)), {
        tags: {
          service: 'redmine-credentials-server',
          errorType: 'decrypt_failed',
        },
        extra: {
          credentialsId: credentials.$id,
          reason: 'Key rotation or corrupted data detected',
        },
      });
      
      // Throw a specific error that can be caught and handled by the UI
      throw new Error('CREDENTIALS_DECRYPTION_FAILED');
    }
  } catch (error) {
    // Log to Sentry first, then handle specific cases
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isUnauthorized = error instanceof Error && error.message === 'unauthorized';
    const isDecryptionFailed = error instanceof Error && error.message === 'CREDENTIALS_DECRYPTION_FAILED';
    
    // Only log non-expected errors to Sentry
    if (!isUnauthorized) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        level: isDecryptionFailed ? 'error' : 'warning',
        tags: {
          service: 'redmine-credentials-server',
          errorType: isDecryptionFailed ? 'credentials_decryption_failed' : 'get_credentials_failed',
        },
        extra: {
          errorMessage,
          willRethrow: isDecryptionFailed,
        },
      });
    } else {
      addBreadcrumb('Unauthorized access to decrypted credentials', { errorMessage }, 'info');
    }
    
    // Re-throw decryption errors so they can be handled by the UI
    if (isDecryptionFailed) {
      throw error;
    }
    
    return null;
  }
}

/**
 * Delete corrupted or invalid Redmine credentials
 * Used when decryption fails due to key rotation or data corruption
 */
export async function deleteCorruptedCredentialsServer() {
  try {
    const user = await requireUserForServer();
    const credentials = await getRedmineCredentialsServer();
    
    if (!credentials) {
      addBreadcrumb('No corrupted credentials to delete', { userId: user.userId }, 'info');
      return { success: true, message: 'No credentials to delete' };
    }

    const { databases } = createAdminClient();
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      credentials.$id!
    );

    // This IS an important event - log it as warning
    logError(new Error('Corrupted credentials deleted'), {
      level: 'warning',
      tags: {
        service: 'redmine-credentials-server',
        errorType: 'corrupted_credentials_deleted',
      },
      extra: {
        userId: user.userId,
        credentialId: credentials.$id,
        baseUrl: credentials.baseUrl,
      },
    });

    return { success: true, message: 'Corrupted credentials deleted' };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials-server',
        errorType: 'delete_corrupted_failed',
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete credentials'
    };
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
    
    addBreadcrumb('Saving Redmine credentials', { 
      userId: user.userId,
      baseUrl: credentials.baseUrl 
    }, 'info');

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
      
      addBreadcrumb('Redmine credentials updated', {
        credentialId: result.$id,
        baseUrl: credentials.baseUrl,
      }, 'info');
      
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
      
      addBreadcrumb('Redmine credentials created', {
        credentialId: result.$id,
        baseUrl: credentials.baseUrl,
      }, 'info');
      
      return { success: true, credentials: result };
    }
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      level: 'error',
      tags: {
        service: 'redmine-credentials-server',
        errorType: 'save_failed',
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
        baseUrl: credentials.baseUrl,
      },
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to save Redmine credentials. Please try again.';
    return {
      success: false,
      error: errorMessage
    };
  }
}
