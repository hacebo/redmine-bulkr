"use server";
import { revalidatePath } from "next/cache";
import { Client, Account } from "appwrite";
import { requireUserForServer } from "@/lib/auth.server";

export interface TimeEntryPreferences {
  requireIssue: boolean;
}

export async function updatePrefsWithJWT(jwt: string, prefs: { requireIssue: boolean }) {
  const me = await requireUserForServer();

  const c = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setJWT(jwt);
  const acc = new Account(c);

  const appwriteUser = await acc.get();
  if (appwriteUser.$id !== me.userId) throw new Error("token/user mismatch");

  await acc.updatePrefs(prefs);
  revalidatePath("/settings/preferences");
  return { ok: true };
}

/**
 * Get user preferences (requires JWT to read from Appwrite user account)
 * Note: This must be called from client context that can provide JWT
 */
export async function getTimeEntryPreferencesWithJWT(jwt: string): Promise<TimeEntryPreferences> {
  const defaults: TimeEntryPreferences = {
    requireIssue: true,
  };

  try {
    const me = await requireUserForServer();

    const c = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setJWT(jwt);
    const acc = new Account(c);

    const appwriteUser = await acc.get();
    if (appwriteUser.$id !== me.userId) throw new Error("token/user mismatch");

    // Get preferences from Appwrite user account
    const requireIssue = appwriteUser.prefs?.requireIssue;
    
    return {
      requireIssue: typeof requireIssue === 'boolean' ? requireIssue : defaults.requireIssue,
    };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return defaults;
  }
}


