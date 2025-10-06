import { Client, Account, Databases, ID } from 'appwrite';
import { Client as NodeClient, Databases as NodeDatabases } from 'node-appwrite';

// Client-side client (for public operations only)
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Initialize services for client-side
export const account = new Account(client);
export const databases = new Databases(client);

/**
 * Server-side client factory using JWT for user-context operations
 * Use this when you need to perform operations as the authenticated user
 * Example: account.updatePrefs(), account.get() with user context
 */
export function createAuthenticatedClient(jwt: string) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setJWT(jwt);

  return {
    account: new Account(client),
    databases: new Databases(client),
  };
}

/**
 * Server-side admin client using API key for database operations
 * Use this for SSR pages that need to read data without user JWT
 * Note: Has full admin access - only use for user-scoped queries
 */
export function createAdminClient() {
  if (!process.env.APPWRITE_API_KEY) {
    throw new Error('APPWRITE_API_KEY is required for server-side operations');
  }

  const client = new NodeClient()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY);

  return {
    databases: new NodeDatabases(client),
  };
}

// Database and collection IDs
export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
export const REDMINE_CREDENTIALS_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID!;

// Export client utilities
export { client, ID };