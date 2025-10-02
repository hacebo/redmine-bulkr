import { NextResponse, type NextRequest } from "next/server";
import { getServerUser } from "@/lib/services/auth";

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Skip auth check for public routes
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth/callback") ||
    request.nextUrl.pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const user = await getServerUser();
  
  if (!user) {
    // Clear any invalid session cookie
    const response = NextResponse.redirect(new URL("/login", request.url));
    
    // Delete any Appwrite session cookie
    const cookies = request.cookies.getAll();
    const appwriteSessionCookies = cookies.filter(c => c.name.startsWith('a_session_'));
    appwriteSessionCookies.forEach(cookie => {
      response.cookies.delete(cookie.name);
    });
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/time-tracking",
    "/bulk-entry", 
    "/settings/:path*",
  ],
};