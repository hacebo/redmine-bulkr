import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const supabase = await createClient();
  let authData = null;
  let authError = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    authData = result.data;
    authError = result.error;
  } else if (token_hash && type === 'email') {
    const result = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash,
    });
    authData = result.data;
    authError = result.error;
  }

  if (!authError && authData?.user) {
    try {
      const existingRows = await db
        .select()
        .from(users)
        .where(eq(users.id, authData.user.id))
        .limit(1);

      if (existingRows.length === 0) {
        await db.insert(users).values({
          id: authData.user.id,
          email: authData.user.email!,
          name: authData.user.user_metadata?.full_name || null,
        });
      }
    } catch (dbError) {
      console.error("Error creating user record:", dbError);
    }

    return NextResponse.redirect(new URL("/time-tracking", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
}
