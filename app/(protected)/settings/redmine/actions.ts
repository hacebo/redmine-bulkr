"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { saveRedmineCredentials } from "@/lib/services/redmine-credentials";
import { getServerUser } from "@/lib/services/auth";

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function saveRedmineCredentialAction(formData: FormData) {
  try {
    const user = await getServerUser();
    if (!user) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }

    const baseUrl = normalizeUrl(String(formData.get("baseUrl") || ""));
    const apiKey = String(formData.get("apiKey") || "");

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error: "Missing Redmine URL or API key"
      };
    }

    const result = await saveRedmineCredentials({ baseUrl, apiKey });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to save credentials"
      };
    }

    // Invalidate all cached data for this user since credentials changed
    revalidateTag(`projects:${user.$id}`);
    revalidateTag(`activities:${user.$id}`);
    revalidateTag(`time-entries:${user.$id}`);
    revalidatePath("/time-tracking");
    
    return {
      success: true,
      message: "Redmine credentials saved successfully!",
      redirect: "/time-tracking"
    };
  } catch (error: any) {
    console.error("Error saving Redmine credentials:", error);
    return {
      success: false,
      error: error.message || "Failed to save credentials"
    };
  }
}

export async function testRedmineConnectionAction() {
  try {
    const { getDecryptedRedmineCredentials } = await import("@/lib/services/redmine-credentials");
    
    const credentials = await getDecryptedRedmineCredentials();
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
  } catch (error: any) {
    console.error('Test connection error:', error);
    return { 
      success: false, 
      error: error.message || "Connection test failed. Please check your credentials." 
    };
  }
}
