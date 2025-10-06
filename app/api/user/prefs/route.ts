import { NextResponse } from "next/server";
import { Client, Account } from "appwrite";
import { requireUserForServer } from "@/lib/auth.server";

export async function POST(req: Request) {
  // 1) Our app session (JOSE)
  const me = await requireUserForServer(); // throws 401 if missing

  // 2) Appwrite JWT from Authorization
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "missing token" }, { status: 401 });

  // 3) Validate Appwrite JWT and bind it to same user
  const c = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setJWT(jwt);
  const acc = new Account(c);

  let appwriteUser;
  try {
    appwriteUser = await acc.get();
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  if (appwriteUser.$id !== me.userId) {
    return NextResponse.json({ error: "token/user mismatch" }, { status: 403 });
  }

  // 4) Safe to act as the user
  const body = await req.json();
  await acc.updatePrefs(body); // e.g., { requireIssue: true }

  return NextResponse.json({ ok: true });
}
