"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUserForServer } from "@/lib/auth.server";
import { logError } from "@/lib/sentry";
import { Client, Account } from "appwrite";
import { createAdminClient, APPWRITE_DATABASE_ID, REDMINE_CREDENTIALS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from 'node-appwrite';

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function saveRedmineCredentialAction(formData: FormData) {
  try {
    const user = await requireUserForServer();

    const baseUrl = normalizeUrl(String(formData.get("baseUrl") || ""));
    const apiKey = String(formData.get("apiKey") || "");

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error: "Missing Redmine URL or API key"
      };
    }

    // Use the server-only version that works with our cookie auth
    const { saveRedmineCredentialsServer } = await import("@/lib/services/redmine-credentials-server");
    const result = await saveRedmineCredentialsServer({ baseUrl, apiKey });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to save credentials"
      };
    }

    // Invalidate all cached data for this user since credentials changed
    revalidateTag(`projects:${user.userId}`);
    revalidateTag(`activities:${user.userId}`);
    revalidateTag(`time-entries:${user.userId}`);
    revalidatePath("/time-tracking");
    
    return {
      success: true,
      message: "Redmine credentials saved successfully!",
      redirect: "/time-tracking"
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        action: 'save_redmine_credentials',
        errorType: 'save_failed',
      },
    });
    const errorMessage = error instanceof Error ? error.message : "Failed to save credentials";
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function testRedmineConnectionAction() {
  try {
    const { getDecryptedRedmineCredentialsServer } = await import("@/lib/services/redmine-credentials-server");
    
    const credentials = await getDecryptedRedmineCredentialsServer();
    if (!credentials) {
      return { 
        success: false, 
        error: "No Redmine credentials found. Please save your credentials first." 
      };
    }

    const res = await fetch(`${credentials.baseUrl}/my/account.json`, {
      headers: { "X-Redmine-API-Key": credentials.apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      return { 
        success: false, 
        error: `Connection test failed (${res.status}): ${res.statusText}. Please check your credentials.` 
      };
    }

    const data = await res.json();
    return { 
      success: true, 
      message: `Connection successful! Connected as ${data.user?.firstname || data.user?.login || 'user'}` 
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        action: 'test_redmine_connection',
        errorType: 'connection_test_failed',
      },
    });
    const errorMessage = error instanceof Error ? error.message : "Connection test failed. Please check your credentials.";
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function deleteRedmineCredentialsAction(jwt: string) {
  try {
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
    const { databases } = createAdminClient();
    
    // Find user's credentials
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      [Query.equal("userId", me.userId)]
    );

    if (response.documents.length === 0) {
      return { 
        success: true,
        message: "No credentials found to delete"
      };
    }

    // Delete the credentials document
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      REDMINE_CREDENTIALS_COLLECTION_ID,
      response.documents[0].$id
    );

    // Invalidate all cached data for this user since credentials were deleted
    revalidateTag(`projects:${me.userId}`);
    revalidateTag(`activities:${me.userId}`);
    revalidateTag(`time-entries:${me.userId}`);
    revalidatePath("/time-tracking");
    revalidatePath("/bulk-entry");

    return { 
      success: true, 
      message: "Redmine credentials deleted successfully" 
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        action: 'delete_redmine_credentials',
        errorType: 'credentials_deletion',
      },
    });
    
    const errorMessage = error instanceof Error ? error.message : "Failed to delete credentials. Please try again.";
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
