'use server';

import { account, ID } from '@/lib/appwrite';
import {
  checkMagicLinkRateLimit,
  setMagicLinkCooldown,
} from '@/lib/services/rate-limit';
import { logError } from '@/lib/sentry';

export interface SendMagicLinkResult {
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
  retryAfter?: number;
}

/**
 * Send magic link for passwordless authentication
 * Called by MagicLinkForm
 * Enforces rate limiting and cooldowns to prevent abuse
 */
export async function sendMagicLink(
  prevState: SendMagicLinkResult | null,
  formData: FormData
): Promise<SendMagicLinkResult> {
  try {
    const email = formData.get('email') as string;

    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    // Check rate limits
    const rateLimitCheck = await checkMagicLinkRateLimit(email);

    if (!rateLimitCheck.allowed) {
      if (rateLimitCheck.reason === 'cooldown') {
        return {
          success: false,
          error: `Please wait ${rateLimitCheck.cooldownSeconds} seconds before requesting another magic link`,
          cooldownSeconds: rateLimitCheck.cooldownSeconds,
        };
      }

      if (rateLimitCheck.reason === 'rate_limit') {
        const minutes = Math.ceil((rateLimitCheck.retryAfter || 3600) / 60);
        return {
          success: false,
          error: `Too many requests. Please try again in ${minutes} minutes`,
          retryAfter: rateLimitCheck.retryAfter,
        };
      }
    }

    // Generate a unique userId using Appwrite ID generator
    const userId = ID.unique();
    
    // Use Vercel URL if available, then NEXT_PUBLIC_APP_URL, then localhost
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const callbackUrl = `${baseUrl}/auth/callback`;

    await account.createMagicURLToken(userId, email, callbackUrl);

    // Set cooldown after successful send
    await setMagicLinkCooldown(email);

    return {
      success: true,
      cooldownSeconds: rateLimitCheck.cooldownSeconds,
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        service: 'auth',
        errorType: 'magic_link_send_failed',
      },
      extra: {
        email: formData.get('email') as string,
      },
    });
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send magic link';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
