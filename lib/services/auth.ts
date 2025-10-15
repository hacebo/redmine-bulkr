'use server';

import { account, ID } from '@/lib/appwrite';
import {
  checkMagicLinkRateLimit,
  setMagicLinkCooldown,
} from '@/lib/services/rate-limit';
import { logError, addBreadcrumb } from '@/lib/sentry';

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
      addBreadcrumb('Magic link request missing email', {}, 'warning');
      return { success: false, error: 'Email is required' };
    }

    addBreadcrumb('Magic link requested', { email }, 'info');

    // Check rate limits
    const rateLimitCheck = await checkMagicLinkRateLimit(email);

    if (!rateLimitCheck.allowed) {
      if (rateLimitCheck.reason === 'cooldown') {
        addBreadcrumb('Magic link blocked by cooldown', { 
          email,
          cooldownSeconds: rateLimitCheck.cooldownSeconds 
        }, 'info');
        return {
          success: false,
          error: `Please wait ${rateLimitCheck.cooldownSeconds} seconds before requesting another magic link`,
          cooldownSeconds: rateLimitCheck.cooldownSeconds,
        };
      }

      if (rateLimitCheck.reason === 'rate_limit') {
        addBreadcrumb('Magic link blocked by rate limit', { 
          email,
          retryAfter: rateLimitCheck.retryAfter 
        }, 'warning');
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
    
    // Get base URL from environment - required for magic link callbacks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null);
    
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_VERCEL_URL must be set for magic link authentication');
    }
    
    const callbackUrl = `${baseUrl}/auth/callback`;

    await account.createMagicURLToken(userId, email, callbackUrl);

    // Set cooldown after successful send
    await setMagicLinkCooldown(email);

    addBreadcrumb('Magic link sent successfully', { 
      email,
      userId 
    }, 'info');

    return {
      success: true,
      cooldownSeconds: rateLimitCheck.cooldownSeconds,
    };
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      level: 'error',
      tags: {
        service: 'auth',
        errorType: 'magic_link_send_failed',
      },
      extra: {
        email: formData.get('email') as string,
        errorMessage: error instanceof Error ? error.message : String(error),
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
