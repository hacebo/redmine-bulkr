'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MagicLinkForm } from './magic-link-form';
import { Client, Account } from 'appwrite';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email || !password) {
        setError('Email and password are required');
        return;
      }

      // Create Appwrite session
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
      const account = new Account(client);

      await account.createEmailPasswordSession(email, password);
      await account.get();

      const { jwt } = await account.createJWT();

      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` }
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session cookie');
      }

      window.location.href = '/time-tracking';
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

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
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
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