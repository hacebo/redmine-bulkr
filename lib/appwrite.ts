import { Client, Account, Databases, ID } from 'appwrite';
import { cookies } from 'next/headers';

// Client-side client (for public operations only)
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Initialize services for client-side
export const account = new Account(client);
export const databases = new Databases(client);

// Server-side session client factory
export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const cookieStore = await cookies();
  
  // Find Appwrite session cookie (starts with 'a_session_')
  const allCookies = cookieStore.getAll();
  const sessionCookie = allCookies.find(cookie => cookie.name.startsWith('a_session_'));
  
  if (sessionCookie) {
    client.setSession(sessionCookie.value);
  }

  return {
    account: new Account(client),
    databases: new Databases(client),
  };
}

// Database and collection IDs
export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
export const REDMINE_CREDENTIALS_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID!;

// Note: For server-side operations, use createSessionClient() to get authenticated instances

// Database types
export interface RedmineCredentials {
  userId: string;
  baseUrl: string;
  apiKeyEnc: string;
  iv: string;
  tag: string;
  redmineUserId?: string;
}

export interface User {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
}

export { client, ID };