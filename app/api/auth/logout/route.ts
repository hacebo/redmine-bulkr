import { NextResponse } from "next/server";
import { clearAppCookie } from "@/lib/auth.server";
export async function POST() {
  await clearAppCookie();
  return NextResponse.json({ ok: true });
}
