"use server";

import { getServerUser } from "@/lib/services/auth";
import { deleteRedmineCredentials } from "@/lib/services/redmine-credentials";
import { createSessionClient } from "@/lib/appwrite";

export async function clearAccountDataAction() {
  try {
    const user = await getServerUser();
    if (!user) {
      return { 
        success: false, 
        error: "Unauthorized - please log in again" 
      };
    }

    // Delete Redmine credentials from Appwrite
    const credentialsResult = await deleteRedmineCredentials();
    if (!credentialsResult.success) {
      return {
        success: false,
        error: `Failed to delete Redmine credentials: ${credentialsResult.error}`
      };
    }

    // Delete user session and account from Appwrite
    const { account } = await createSessionClient();
    
    // Delete all sessions (logout)
    await account.deleteSessions();

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
