"use server";

import { requireUserForServer, clearAppCookie } from "@/lib/auth.server";
import { deleteRedmineCredentials } from "@/lib/services/redmine-credentials";
import { clearUserContext, logError } from "@/lib/sentry";
import { Client, Account } from "appwrite";

export async function clearAccountDataAction(jwt: string) {
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

    // Delete Redmine credentials from Appwrite
    const credentialsResult = await deleteRedmineCredentials(jwt);
    if (!credentialsResult.success) {
      return {
        success: false,
        error: `Failed to delete Redmine credentials: ${credentialsResult.error}`
      };
    }

    // Delete all sessions (logout)
    await acc.deleteSessions();

    // Clear our app session cookie
    await clearAppCookie();
    
    // Clear Sentry user context
    clearUserContext();

    return { 
      success: true, 
      message: "All data cleared and logged out successfully." 
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        action: 'clear_account_data',
        errorType: 'account_deletion',
      },
    });
    
    const errorMessage = error instanceof Error ? error.message : "Failed to clear account data. Please try again.";
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
