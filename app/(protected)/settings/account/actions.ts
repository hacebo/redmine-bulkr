"use server";

import { requireUserForServer } from "@/lib/auth.server";
import { deleteRedmineCredentials } from "@/lib/services/redmine-credentials";
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

    return { 
      success: true, 
      message: "All data cleared and logged out successfully." 
    };
  } catch (error: unknown) {
    console.error("Error clearing account data:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to clear account data. Please try again.";
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
