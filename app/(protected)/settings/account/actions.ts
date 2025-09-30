"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, redmineCredentials } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function deleteAccountAction() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await db
      .delete(redmineCredentials)
      .where(eq(redmineCredentials.userId, user.id));

    await db
      .delete(users)
      .where(eq(users.id, user.id));

    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error deleting account:", error);
    throw new Error("Failed to delete account. Please try again.");
  }

  redirect("/login");
}
