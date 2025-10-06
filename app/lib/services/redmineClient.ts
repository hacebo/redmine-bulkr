import { getDecryptedRedmineCredentialsServer } from "@/lib/services/redmine-credentials-server";
import { RedmineService } from "./redmine";

/**
 * Get Redmine HTTP client for the current authenticated user
 */
export async function getRedmineClientForUser(): Promise<RedmineService> {
  const credentials = await getDecryptedRedmineCredentialsServer();
  if (!credentials) {
    throw new Error("No Redmine credentials found. Please configure your Redmine settings.");
  }

  return new RedmineService(credentials.baseUrl, credentials.apiKey);
}

/**
 * Get Redmine user ID from stored credentials
 * Use this when you need to filter queries by user (e.g., time entries)
 */
export async function getRedmineUserId(): Promise<number> {
  const credentials = await getDecryptedRedmineCredentialsServer();
  
  if (!credentials) {
    throw new Error('No Redmine credentials found. Please configure your credentials in Settings → Redmine.');
  }

  if (!credentials.redmineUserId) {
    throw new Error('Redmine user ID is missing. Please re-save your credentials in Settings → Redmine.');
  }

  return parseInt(credentials.redmineUserId);
}