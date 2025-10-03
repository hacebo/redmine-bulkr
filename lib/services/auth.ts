'use server';

import { createSessionClient, account, ID } from '@/lib/appwrite';
import { redirect } from 'next/navigation';

export interface AuthUser {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
  prefs: Record<string, unknown>;
}

export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      emailVerification: user.emailVerification,
      prefs: user.prefs,
    };
  } catch (error: unknown) {
    // Don't log expected "not logged in" errors (401 unauthorized)
    // These happen normally when users aren't authenticated
    if (error && typeof error === 'object' && 
        'code' in error && error.code !== 401 && 
        'type' in error && error.type !== 'general_unauthorized_scope') {
      console.error('Error getting server user:', error);
    }
    return null;
  }
}

export async function loginWithEmail(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    
    return { success: true, user };
  } catch (error: unknown) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function registerWithEmail(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    
    if (!email || !password || !name) {
      return { success: false, error: 'Email, password, and name are required' };
    }
    
    const user = await account.create(ID.unique(), email, password, name);
    
    // Send email verification
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify`;
    await account.createVerification(callbackUrl);
    
    return { success: true, user };
  } catch (error: unknown) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

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

export async function logout() {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession('current');
  } catch (error) {
    // Log actual errors, but redirect() throws NEXT_REDIRECT which is normal
    if (error instanceof Error && !error.message.includes('NEXT_REDIRECT')) {
      console.error('Logout error:', error);
    }
  }
  
  // Always redirect after logout (whether successful or not)
  redirect('/login');
}

export async function verifyEmail(userId: string, secret: string) {
  try {
    await account.updateVerification(userId, secret);
    
    // Appwrite handles session cookies automatically
    // No need to manually set cookies
    
    return { success: true, user: await account.get() };
  } catch (error: unknown) {
    console.error('Email verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
