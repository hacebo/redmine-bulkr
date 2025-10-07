'use server';

import { createAuthenticatedClient, APPWRITE_DATABASE_ID, REDMINE_CREDENTIALS_COLLECTION_ID } from '@/lib/appwrite';
import { requireUserForServer } from '@/lib/auth.server';
import { Client, Account } from 'appwrite';
import { encryptToGcm, decryptFromGcm } from '@/lib/crypto';
import { ID, Query, Permission, Role } from 'appwrite';
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

export async function saveRedmineCredentials(credentials: RedmineCredentialsInput, jwt: string) {
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
    const existingCredentials = await getRedmineCredentials(jwt);
    const { databases } = await createAuthenticatedClient(jwt);
    
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
      // Create new credentials with proper permissions
      const permissions = [
        Permission.read(Role.user(user.userId)),
        Permission.update(Role.user(user.userId)),
        Permission.delete(Role.user(user.userId))
      ];
      
      const result = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        ID.unique(),
        credentialsData,
        permissions
      );
      
      return { success: true, credentials: result };
    }
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials',
        errorType: 'save_failed',
      },
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to save credentials';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function getRedmineCredentials(jwt: string): Promise<RedmineCredentials | null> {
  try {
    const user = await requireUserForServer();

    const { databases } = await createAuthenticatedClient(jwt);
    
    // Query for user's credentials
    let response;
    try {
      response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        [Query.equal("userId", user.userId)]
      );
    } catch (error: unknown) {
      // If user has no credentials yet, return null instead of throwing
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 401 || error.code === 404)) {
        return null;
      }
      throw error;
    }

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
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials',
        errorType: 'get_failed',
      },
      level: 'warning',
    });
    return null;
  }
}

export async function getDecryptedRedmineCredentials(jwt: string) {
  try {
    const credentials = await getRedmineCredentials(jwt);
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
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials',
        errorType: 'decrypt_failed',
      },
    });
    return null;
  }
}

/**
 * Delete Redmine credentials (using admin client for cross-domain compatibility)
 * Called by clearAccountDataAction after JWT validation
 */
export async function deleteRedmineCredentials(jwt: string) {
  try {
    // Validate JWT and user match
    const me = await requireUserForServer();
    
    const c = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setJWT(jwt);
    const acc = new Account(c);
    
    const appwriteUser = await acc.get();
    if (appwriteUser.$id !== me.userId) {
      return {
        success: false,
        error: "token/user mismatch"
      };
    }

    // Use admin client to delete (cross-domain compatible)
    const { createAdminClient } = await import('@/lib/appwrite');
    const { Query: NodeQuery } = await import('node-appwrite');
    const { databases } = createAdminClient();
    
    // Find user's credentials
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      [NodeQuery.equal("userId", me.userId)]
    );

    if (response.documents.length === 0) {
      // No credentials to delete
      return { success: true };
    }

    // Delete the credentials document
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      response.documents[0].$id
    );

    return { success: true };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials',
        errorType: 'delete_failed',
      },
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete credentials';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function validateRedmineCredentials(baseUrl: string, apiKey: string) {
  try {
    // Test the credentials by calling Redmine API
    const response = await fetch(`${baseUrl}/my/account.json`, {
      headers: {
        'X-Redmine-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Redmine API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { 
      success: true, 
      user: data.user,
      message: 'Credentials validated successfully' 
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'redmine-credentials',
        errorType: 'validation_failed',
      },
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate credentials';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}