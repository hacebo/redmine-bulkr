"use client";
import { Client, Account } from "appwrite";

let cache: { jwt: string; ts: number } | null = null;

export async function getAppwriteJWT(): Promise<string> {
  const now = Date.now();
  if (cache && now - cache.ts < 5 * 60_000) return cache.jwt; // reuse ≤5m
  const c = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  const acc = new Account(c);
  const { jwt } = await acc.createJWT();
  cache = { jwt, ts: now };
  return jwt;
}
