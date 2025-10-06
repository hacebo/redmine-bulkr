"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUserForServer } from "@/lib/auth.server";

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
    console.error("Error saving Redmine credentials:", error);
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
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : "Connection test failed. Please check your credentials.";
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
