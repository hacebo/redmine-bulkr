'use server';

import { createSessionClient, APPWRITE_DATABASE_ID, REDMINE_CREDENTIALS_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

export async function getEncryptedRedmineCredential(userId: string) {
  try {
    const { databases } = await createSessionClient();
    
    let response;
    try {
      response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        [Query.equal("userId", userId)]
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
    
    const cred = response.documents[0];
    
    return {
      baseUrl: cred.baseUrl.replace(/\/$/, ""),
      redmineUserId: parseInt(cred.redmineUserId || '0'),
      encB64: cred.apiKeyEnc,
      ivB64: cred.iv,
      tagB64: cred.tag,
    };
  } catch (error) {
    console.error('[CredentialStore] Error getting credentials:', error);
    throw error;
  }
}

export async function upsertEncryptedRedmineCredential(args: {
  userId: string;
  baseUrl: string;
  redmineUserId: number;
  encB64: string;
  ivB64: string;
  tagB64: string;
}) {
  const cleanUrl = args.baseUrl.replace(/\/$/, "");
  
  try {
    const { databases } = await createSessionClient();
    
    // Check if credentials already exist
    const existing = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      [Query.equal("userId", args.userId)]
    );

    if (existing.documents.length > 0) {
      // Update existing credentials
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        existing.documents[0].$id,
        {
          baseUrl: cleanUrl,
          redmineUserId: args.redmineUserId.toString(),
          apiKeyEnc: args.encB64,
          iv: args.ivB64,
          tag: args.tagB64,
        }
      );
    } else {
      // Create new credentials
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        REDMINE_CREDENTIALS_COLLECTION_ID,
        ID.unique(),
        {
          userId: args.userId,
          baseUrl: cleanUrl,
          redmineUserId: args.redmineUserId.toString(),
          apiKeyEnc: args.encB64,
          iv: args.ivB64,
          tag: args.tagB64,
        }
      );
    }
  } catch (error) {
    console.error('[CredentialStore] Error upserting credentials:', error);
    throw error;
  }
}
