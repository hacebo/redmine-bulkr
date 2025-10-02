// Instead of calling updateMagicURLSession here, just redirect to the client page
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const secret = url.searchParams.get("secret");

  // Forward params to a client route that will finish the session in the browser
  const next = new URL(`/auth/callback`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (userId) next.searchParams.set("userId", userId);
  if (secret) next.searchParams.set("secret", secret);

  return NextResponse.redirect(next);
}