'use server';

import { account } from '@/lib/appwrite';

/**
 * Send magic link for passwordless authentication
 * Called by MagicLinkForm
 */
export async function sendMagicLink(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
) {
  try {
    const email = formData.get('email') as string;
    
    if (!email) {
      return { success: false, error: 'Email is required' };
    }
    
    // Generate a valid userId (max 36 chars, alphanumeric + period, hyphen, underscore)
    const userId = `user${Date.now().toString(36).substring(0, 8)}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`;
    
    await account.createMagicURLToken(userId, email, callbackUrl);
    return { success: true };
  } catch (error: unknown) {
    console.error('Magic link error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
