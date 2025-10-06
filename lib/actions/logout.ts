"use server";

import { clearAppCookie } from "@/lib/auth.server";
import { revalidatePath } from "next/cache";

/**
 * Logout action - clears our app session cookie
 * Note: Client must also clear Appwrite session cookies via account.deleteSessions()
 * This is done client-side because Appwrite sessions are on different domain
 */
export async function logoutAction() {
    // Clear our app session cookie
    await clearAppCookie();
    
    // Revalidate all paths to clear any cached user data
    revalidatePath("/", "layout");
    
    return { success: true };
}
