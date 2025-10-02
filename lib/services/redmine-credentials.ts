'use server';

import { createSessionClient, APPWRITE_DATABASE_ID, REDMINE_CREDENTIALS_COLLECTION_ID } from '@/lib/appwrite';
import { getServerUser } from '@/lib/services/auth';
import { encryptToGcm, decryptFromGcm } from '@/lib/crypto';
import { ID, Query, Permission, Role } from 'appwrite';
import { RedmineService } from '@/app/lib/services/redmine';

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

export async function saveRedmineCredentials(credentials: RedmineCredentialsInput) {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Encrypt the API key
    const { encB64, ivB64, tagB64 } = encryptToGcm(credentials.apiKey);

    // Get the Redmine user ID by making a test API call (required)
    const tempClient = new RedmineService(credentials.baseUrl, credentials.apiKey);
    const currentUser = await tempClient.getCurrentUser();
    const redmineUserId = currentUser.user.id.toString();

    const credentialsData: Omit<RedmineCredentials, '$id' | 'createdAt' | 'updatedAt'> = {
      userId: user.$id,
      baseUrl: credentials.baseUrl,
      apiKeyEnc: encB64,
      iv: ivB64,
      tag: tagB64,
      redmineUserId,
    };

    // Check if credentials already exist for this user
    const existingCredentials = await getRedmineCredentials();
    const { databases } = await createSessionClient();
    
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
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id))
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
  } catch (error: any) {
    console.error('Error saving Redmine credentials:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save credentials' 
    };
  }
}

export async function getRedmineCredentials(): Promise<RedmineCredentials | null> {
  try {
    const user = await getServerUser();
    if (!user) {
      return null;
    }

    const { databases } = await createSessionClient();
    
    // Query for user's credentials
    let response;
    try {
      response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        [Query.equal("userId", user.$id)]
      );
    } catch (error: any) {
      // If user has no credentials yet, return null instead of throwing
      if (error.code === 401 || error.code === 404) {
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
    console.error('Error getting Redmine credentials:', error);
    return null;
  }
}

export async function getDecryptedRedmineCredentials() {
  try {
    const credentials = await getRedmineCredentials();
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
    console.error('Error decrypting Redmine credentials:', error);
    return null;
  }
}

export async function deleteRedmineCredentials() {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const credentials = await getRedmineCredentials();
    if (!credentials || !credentials.$id) {
      // No credentials to delete, consider it success
      return { success: true };
    }

    const { databases } = await createSessionClient();
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      credentials.$id
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Redmine credentials:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete credentials' 
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
  } catch (error: any) {
    console.error('Error validating Redmine credentials:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to validate credentials' 
    };
  }
}