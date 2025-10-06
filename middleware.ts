import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "app_session";
const secret = new TextEncoder().encode(process.env.APP_COOKIE_SECRET!);

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Skip auth check for public routes
  if (
    path.startsWith("/login") ||
    path.startsWith("/auth/callback") ||
    path === "/"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return redirectToLogin(req);

  // Light validity check (signature + exp) at the edge
  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/time-tracking",
    "/bulk-entry", 
    "/settings/:path*",
  ],
};