"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Account } from "appwrite";
import { toast } from "sonner";
import { logError } from "@/lib/sentry";

function CallbackContent() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const userId = sp.get("userId");
        const secret = sp.get("secret");
        
        if (!userId || !secret) {
          console.warn('Auth callback: missing userId or secret params');
        }
        
        const c = new Client()
          .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
          .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
        const acc = new Account(c);

        try {
          await acc.get();
        } catch {
          if (userId && secret) {
            try {
              await acc.updateMagicURLSession(userId, secret);
              await acc.get();
              console.info('Magic link session created successfully');
            } catch (sessionError) {
              console.warn('Magic link session update failed - link expired or invalid');
              logError(sessionError instanceof Error ? sessionError : new Error(String(sessionError)), {
                tags: {
                  flow: 'magic_link_callback',
                  errorType: 'session_update_failed',
                },
              });
              toast.error("Magic link expired or invalid. Please request a new one.");
              router.replace("/login?err=expired-link");
              return;
            }
          } else {
            toast.error("Invalid authentication link. Please try again.");
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
          console.warn('Session exchange failed', { status: sessionResponse.status });
          const errorData = await sessionResponse.json().catch(() => ({}));
          logError(new Error(`Session exchange failed: ${errorData.error || 'Unknown error'}`), {
            tags: {
              flow: 'magic_link_callback',
              errorType: 'session_exchange_failed',
            },
            extra: {
              status: sessionResponse.status,
              errorData,
            },
          });
          toast.error("Failed to create session. Please try logging in again.");
          router.replace("/login?err=session-exchange");
          return;
        }
        
        console.info('Auth flow completed - user authenticated');
        toast.success("Successfully signed in!");
        router.replace("/time-tracking");
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), {
          tags: {
            flow: 'magic_link_callback',
            errorType: 'callback_error',
          },
        });
        toast.error("Authentication failed. Please try again.");
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