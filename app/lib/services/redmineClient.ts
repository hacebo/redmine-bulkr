import { getEncryptedRedmineCredential } from "./credentialStore";
import { decryptFromGcm } from "@/lib/crypto";
import { RedmineService } from "./redmine";

export async function getRedmineClientForUser(userId: string): Promise<{ client: RedmineService; redmineUserId: number }> {
  const cred = await getEncryptedRedmineCredential(userId);
  if (!cred) {
    throw new Error("No Redmine credentials found for user");
  }

  const apiKey = decryptFromGcm(cred.encB64, cred.ivB64, cred.tagB64);
  const client = new RedmineService(cred.baseUrl, apiKey);
  
  return {
    client,
    redmineUserId: cred.redmineUserId
  };
}