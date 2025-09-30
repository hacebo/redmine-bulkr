"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { db } from "@/lib/db";
import { redmineCredentials } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { encryptToGcm, decryptFromGcm } from "@/lib/crypto";

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function saveRedmineCredentialAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const baseUrl = normalizeUrl(String(formData.get("baseUrl") || ""));
  const apiKey = String(formData.get("apiKey") || "");

  if (!baseUrl || !apiKey) {
    throw new Error("Missing Redmine URL or API key");
  }

  const res = await fetch(`${baseUrl}/my/account.json`, {
    headers: { "X-Redmine-API-Key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Invalid Redmine API key or URL");
  }

  const data = await res.json();
  const redmineUser = data?.user;

  if (!redmineUser?.id) {
    throw new Error("Unable to fetch Redmine user information");
  }

  const { encB64, ivB64, tagB64 } = encryptToGcm(apiKey);

  const existing = await db
    .select()
    .from(redmineCredentials)
    .where(eq(redmineCredentials.userId, user.id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(redmineCredentials)
      .set({
        baseUrl,
        redmineUserId: redmineUser.id.toString(),
        apiKeyEnc: encB64,
        iv: ivB64,
        tag: tagB64,
        updatedAt: new Date(),
      })
      .where(eq(redmineCredentials.userId, user.id));
  } else {
    await db.insert(redmineCredentials).values({
      userId: user.id,
      baseUrl,
      redmineUserId: redmineUser.id.toString(),
      apiKeyEnc: encB64,
      iv: ivB64,
      tag: tagB64,
    });
  }

  revalidatePath("/time-tracking");
  redirect("/time-tracking");
}

export async function testRedmineConnectionAction() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const rows = await db
    .select()
    .from(redmineCredentials)
    .where(eq(redmineCredentials.userId, user.id))
    .limit(1);

  const cred = rows[0];
  if (!cred) {
    throw new Error("No Redmine credentials found. Please save your credentials first.");
  }

  const apiKey = decryptFromGcm(cred.apiKeyEnc, cred.iv, cred.tag);
  const res = await fetch(`${cred.baseUrl}/my/account.json`, {
    headers: { "X-Redmine-API-Key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Connection test failed. Please check your credentials.");
  }

  return { ok: true, message: "Connection successful!" };
}
