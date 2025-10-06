'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink } from '@/lib/services/auth';
import { toast } from 'sonner';

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cooldownSeconds > 0) {
      toast.error(`Please wait ${cooldownSeconds} seconds before requesting another link`);
      return;
    }

    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await sendMagicLink(null, formData);

      if (result?.success) {
        toast.success('Magic link sent! Check your email.');
        if (result.cooldownSeconds) {
          setCooldownSeconds(result.cooldownSeconds);
        }
      } else {
        toast.error(result?.error || 'Failed to send magic link');
        if (result?.cooldownSeconds) {
          setCooldownSeconds(result.cooldownSeconds);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send magic link';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const isDisabled = isLoading || cooldownSeconds > 0;

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
          disabled={isDisabled}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isDisabled}>
        {isLoading
          ? 'Sending...'
          : cooldownSeconds > 0
            ? `Wait ${cooldownSeconds}s`
            : 'Send Magic Link'}
      </Button>
    </form>
  );
}
