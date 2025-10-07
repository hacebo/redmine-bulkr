"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Account } from "appwrite";
import { toast } from "sonner";
import { logError } from "@/lib/sentry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
          toast.error("Invalid authentication link. Please try again.");
          router.replace("/login?err=missing-params");
          return;
        }
        
        const c = new Client()
          .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
          .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
        const acc = new Account(c);

        // Always process the magic link to ensure it's validated and consumed
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <CardTitle>Signing you in</CardTitle>
          <CardDescription>
            Please wait while we verify your authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          This should only take a moment...
        </CardContent>
      </Card>
    </div>
  );
}

export default function Callback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Initializing authentication...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}