'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginWithEmail } from '@/lib/services/auth';
import { MagicLinkForm } from './magic-link-form';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(loginWithEmail, null);

  useEffect(() => {
    if (state?.success) {
      router.push('/time-tracking');
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Sign in to manage your Redmine time entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Email & Password</TabsTrigger>
            <TabsTrigger value="magic">Magic Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="password" className="space-y-4">
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={state?.success}>
                {state?.success ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="magic" className="space-y-4">
            <MagicLinkForm />
            <p className="text-xs text-muted-foreground text-center">
              We&apos;ll send you a secure link to sign in without a password
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}