import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { setUserContext } from "./sentry";

const secret = new TextEncoder().encode(process.env.APP_COOKIE_SECRET!);
const COOKIE_NAME = "app_session";

export async function signAppCookie(payload: { uid: string; email?: string }, maxAgeSec = 60 * 60 * 8) {
  const jws = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret);
  (await cookies()).set(COOKIE_NAME, jws, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: maxAgeSec,
  });
}

export async function clearAppCookie() {
  (await cookies()).set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

interface AppCookiePayload {
  uid: string;
  email?: string;
}

export async function getUserFromCookie() {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const { payload } = await jwtVerify(raw, secret);
  const typedPayload = payload as unknown as AppCookiePayload;
  return { userId: typedPayload.uid, email: typedPayload.email };
}

export async function requireUserForPage() {
  const u = await getUserFromCookie();
  if (!u) throw new Error("unauthorized_page"); // pages will redirect in their try/catch
  
  // Set user context for Sentry error tracking
  setUserContext({ id: u.userId, email: u.email });
  
  return u;
}

export async function requireUserForServer() {
  const u = await getUserFromCookie();
  if (!u) throw new Error("unauthorized");
  
  // Set user context for Sentry error tracking
  setUserContext({ id: u.userId, email: u.email });
  
  return u;
}

