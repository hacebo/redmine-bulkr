import { db } from "@/lib/db";
import { redmineCredentials } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function getEncryptedRedmineCredential(userId: string) {
  try {
    const rows = await db
      .select()
      .from(redmineCredentials)
      .where(eq(redmineCredentials.userId, userId))
      .limit(1);
    
    const cred = rows[0];
    if (!cred) {
      return null;
    }
    
    return {
      baseUrl: cred.baseUrl.replace(/\/$/, ""),
      redmineUserId: parseInt(cred.redmineUserId),
      encB64: cred.apiKeyEnc,
      ivB64: cred.iv,
      tagB64: cred.tag,
    };
  } catch (error) {
    console.error('[CredentialStore] Error getting credentials:', error);
    throw error;
  }
}

export async function upsertEncryptedRedmineCredential(args: {
  userId: string;
  baseUrl: string;
  redmineUserId: number;
  encB64: string;
  ivB64: string;
  tagB64: string;
}) {
  const cleanUrl = args.baseUrl.replace(/\/$/, "");
  
  try {
    const existing = await db
      .select()
      .from(redmineCredentials)
      .where(eq(redmineCredentials.userId, args.userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(redmineCredentials)
        .set({
          baseUrl: cleanUrl,
          redmineUserId: args.redmineUserId.toString(),
          apiKeyEnc: args.encB64,
          iv: args.ivB64,
          tag: args.tagB64,
          updatedAt: new Date(),
        })
        .where(eq(redmineCredentials.userId, args.userId))
        .returning();
    } else {
      await db.insert(redmineCredentials).values({
        userId: args.userId,
        baseUrl: cleanUrl,
        redmineUserId: args.redmineUserId.toString(),
        apiKeyEnc: args.encB64,
        iv: args.ivB64,
        tag: args.tagB64,
      }).returning();
    }
  } catch (error) {
    console.error('[CredentialStore] Error upserting credentials:', error);
    throw error;
  }
}
