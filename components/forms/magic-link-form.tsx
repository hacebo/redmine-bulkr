'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink } from '@/lib/services/auth';
import { toast } from 'sonner';

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await sendMagicLink(null, formData);
      
      if (result?.success) {
        toast.success('Magic link sent! Check your email.');
      } else {
        toast.error(result?.error || 'Failed to send magic link');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  );
}
