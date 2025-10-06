"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Account } from "appwrite";

function CallbackContent() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const userId = sp.get("userId");
        const secret = sp.get("secret");
        
        const c = new Client()
          .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
          .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
        const acc = new Account(c);

        try {
          await acc.get();
        } catch {
          if (userId && secret) {
            await acc.updateMagicURLSession(userId, secret);
            await acc.get();
          } else {
            router.replace("/login?err=missing-params");
            return;
          }
        }

        const { jwt } = await acc.createJWT();
        
        const sessionResponse = await fetch("/api/auth/session", { 
          method: "POST", 
          headers: { Authorization: `Bearer ${jwt}` } 
        });
        
        if (!sessionResponse.ok) {
          router.replace("/login?err=session-exchange");
          return;
        }
        
        router.replace("/time-tracking");
      } catch (error) {
        console.error("Auth callback error:", error);
        router.replace("/login?err=callback");
      }
    })();
  }, [sp, router]);

  return <p>Signing you in…</p>;
}

export default function Callback() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <CallbackContent />
    </Suspense>
  );
}