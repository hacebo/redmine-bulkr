"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Account } from "appwrite";

// Client-side account instance for browser operations
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

function MagicCallbackContent() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const userId = sp.get("userId");
    const secret = sp.get("secret");
    if (!userId || !secret) return;

    (async () => {
      try {
        // This MUST run in the browser so Appwrite can set the session cookie for the user's origin
        await account.updateMagicURLSession(userId, secret);
        router.replace("/time-tracking"); // go to your protected area
      } catch (error) {
        console.error('Browser: Magic URL session failed:', error);
        router.replace("/login?err=magic");
      }
    })();
  }, [sp, router]);

  return <p>Signing you in…</p>;
}

export default function MagicCallback() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <MagicCallbackContent />
    </Suspense>
  );
}