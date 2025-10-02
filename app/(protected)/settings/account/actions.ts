"use server";

import { redirect } from "next/navigation";
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
    
    // Note: In Appwrite, users cannot delete their own accounts
    // The account will remain but without credentials and sessions
    // For full account deletion, you would need an admin API key

    // Return success response for toast notification
    return { 
      success: true, 
      message: "All data cleared and logged out successfully." 
    };
  } catch (error: any) {
    console.error("Error clearing account data:", error);
    return { 
      success: false, 
      error: error.message || "Failed to clear account data. Please try again." 
    };
  }
}
