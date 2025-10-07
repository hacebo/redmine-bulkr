import { NextResponse } from "next/server";
import { Client, Account } from "appwrite";
import { signAppCookie, clearAppCookie } from "@/lib/auth.server";
import { clearMagicLinkRateLimit } from "@/lib/services/rate-limit";
import { logError } from "@/lib/sentry";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) {
    console.warn('Session API: missing JWT in authorization header');
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  // Validate Appwrite JWT (acts as user)
  const c = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setJWT(jwt);
  const acc = new Account(c);

  let user;
  try {
    user = await acc.get(); // throws if invalid/expired
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        endpoint: 'auth-session',
        errorType: 'jwt_validation',
      },
      extra: {
        hasJWT: !!jwt,
        jwtLength: jwt?.length,
      },
    });
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  // Clear rate limiting counters after successful authentication
  if (user.email) {
    await clearMagicLinkRateLimit(user.email);
  }

  await signAppCookie({ uid: user.$id, email: user.email });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAppCookie();
  return NextResponse.json({ ok: true });
}
