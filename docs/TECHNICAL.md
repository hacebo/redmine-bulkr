# Technical Documentation

## Architecture Overview

Redmine-Bulkr uses a modern server-first architecture with Next.js 15 App Router and Appwrite backend services.

### Tech Stack Details

- **Frontend**: Next.js 15 with App Router (React 19)
- **Backend**: Appwrite (Authentication, Database, Real-time)
- **Styling**: Tailwind CSS + ShadCN UI components
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Encryption**: AES-256-GCM for credential storage

## Project Structure

```
redmine-bulkr/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── (protected)/              # Protected app routes
│   ├── api/                      # API routes
│   ├── auth/                     # Auth callback handlers
│   └── lib/                      # App-specific utilities
│       ├── actions/              # Server actions
│       ├── services/             # API service layer
│       └── types/                # TypeScript types
├── components/                   # React components
│   ├── ui/                      # ShadCN UI components
│   ├── forms/                   # Form components
│   ├── shared/                  # Shared components
│   └── dashboard/               # Dashboard components
├── lib/                         # Shared utilities
│   ├── services/                # Core services
│   └── actions/                 # Shared actions
├── hooks/                       # Custom React hooks
├── docs/                        # Documentation
└── scripts/                     # Build/utility scripts
```

## Authentication Architecture

### Cross-Domain Challenge

Redmine-Bulkr uses Appwrite Cloud (cloud.appwrite.io) with deployment on Vercel (yourapp.vercel.app). This creates a cross-domain cookie challenge:
- Appwrite session cookies are domain-scoped to cloud.appwrite.io
- Our application cannot access these cookies server-side (different domain)
- Standard Appwrite session-based auth doesn't work for SSR or middleware

### Solution: Dual Authentication System

We implement a hybrid authentication model:

1. **Appwrite Sessions** (cloud.appwrite.io domain)
   - Maintained by Appwrite SDK on client side
   - Used for creating JWTs and user account operations
   - Cannot be accessed by our server-side code

2. **Custom App Cookie** (our domain)
   - JOSE-signed HttpOnly cookie: `app_session`
   - Created via JWT exchange after Appwrite login
   - Used by middleware and all server-side auth checks

3. **Admin API Key** (server-side)
   - Used for database operations in SSR context
   - Enables reading data without user JWT
   - All queries are user-scoped via userId field

### Authentication Flow

1. **Login**: User requests magic link via Appwrite
2. **Callback**: Client establishes Appwrite session (their domain)
3. **JWT Exchange**: Client creates JWT from Appwrite session
4. **Cookie Creation**: Server validates JWT and creates our app_session cookie
5. **Access**: Middleware validates our cookie for protected routes

### Operation Patterns

**User Account Operations** (Appwrite user prefs, sessions):
- Client gets JWT via getAppwriteJWT()
- Server validates with double-check pattern
- Operations run as-the-user via account.updatePrefs(), account.deleteSessions()

**Database Operations** (Redmine credentials):
- Server uses admin API key for reads/writes
- All queries filtered by userId from our cookie
- No cross-domain issues, works in SSR

**Redmine API Operations** (external):
- Server-only actions
- Uses stored credentials fetched via admin client
- No user session required

## Data Flow

### Redmine Integration

1. **Credential Storage**: User's Redmine credentials encrypted and stored in Appwrite
2. **API Authentication**: Server-side decryption for Redmine API calls
3. **Data Fetching**: Direct Redmine API integration (no local database)
4. **Time Entries**: Bulk creation and retrieval from Redmine

### Security Model

**Multi-Layer Security:**

1. **Authentication Layer**
   - JOSE-signed HttpOnly cookies (HS256)
   - Middleware validates signature and expiration
   - 8-hour session expiration (configurable)

2. **Authorization Layer**
   - requireUserForServer() validates on every operation
   - User ID extracted from verified cookie payload

3. **Sensitive Operations**
   - JWT double-check pattern for user account ops
   - Validates both our cookie AND Appwrite JWT
   - Enforces user ID match (prevents token swapping)

4. **Data Access**
   - Admin API key for database operations
   - All queries user-scoped via userId field
   - No data leakage between users

5. **Encryption**
   - AES-256-GCM for Redmine API key storage
   - Per-credential IV and authentication tag
   - Server-side decryption only

**Why Admin API Key is Safe:**
- Used only after user authentication via our cookie
- All database queries explicitly filter by userId
- Collection-level permissions in Appwrite
- No direct user input to query parameters

## Component Patterns

### Server Components (SSR)
```typescript
// app/(protected)/page.tsx
import { requireUserForPage } from '@/lib/auth.server';

export default async function Page() {
  const user = await requireUserForPage();
  return <ServerComponent user={user} />;
}
```

### Server Actions (Database Operations)
```typescript
'use server';
import { requireUserForServer } from '@/lib/auth.server';
import { getDecryptedRedmineCredentialsServer } from '@/lib/services/redmine-credentials-server';

export async function someAction() {
  await requireUserForServer(); // Validate auth
  const credentials = await getDecryptedRedmineCredentialsServer(); // Admin client
  // Process with credentials...
  return { success: true };
}
```

### Server Actions (User Account Operations)
```typescript
'use server';
import { requireUserForServer } from '@/lib/auth.server';
import { Client, Account } from 'appwrite';

export async function updateUserPrefs(jwt: string, prefs: object) {
  // Double-check pattern
  const me = await requireUserForServer();
  
  const c = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setJWT(jwt);
  const acc = new Account(c);
  
  const appwriteUser = await acc.get();
  if (appwriteUser.$id !== me.userId) throw new Error("token/user mismatch");
  
  await acc.updatePrefs(prefs);
  return { ok: true };
}
```

### Client Components (Interactive)
```typescript
'use client';
import { getAppwriteJWT } from '@/lib/appwrite-jwt.client';
import { updateUserPrefs } from './actions';

export function PreferencesForm() {
  async function handleSubmit(formData: FormData) {
    const jwt = await getAppwriteJWT();
    await updateUserPrefs(jwt, { setting: true });
  }
  
  return <form action={handleSubmit}>...</form>;
}
```

## API Integration

### Redmine Service
```typescript
class RedmineService {
  async getProjects(): Promise<Project[]>
  async getActivities(): Promise<Activity[]>
  async getTimeEntries(userId, from, to): Promise<TimeEntry[]>
  async createTimeEntry(entry): Promise<TimeEntry>
}
```

### Appwrite Integration

**Client-Side (Web SDK):**
```typescript
// Client-side operations (browser only)
import { account } from '@/lib/appwrite';
import { getAppwriteJWT } from '@/lib/appwrite-jwt.client';

// Create JWT from Appwrite session
const jwt = await getAppwriteJWT();

// Send magic link
await account.createMagicURLToken(userId, email, callbackUrl);
```

**Server-Side (Node SDK with Admin API Key):**
```typescript
// Server-side database operations
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

const { databases } = createAdminClient();
const docs = await databases.listDocuments(
  databaseId,
  collectionId,
  [Query.equal('userId', currentUserId)]
);
```

**Server-Side (Web SDK with User JWT):**
```typescript
// User account operations (as-the-user)
import { Client, Account } from 'appwrite';

const c = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setJWT(jwt);
const acc = new Account(c);

await acc.updatePrefs(prefs);
```

## Performance Optimizations

- **Server Components**: Reduced client-side JavaScript
- **Streaming**: Suspense boundaries for progressive loading
- **Caching**: Appwrite built-in caching + Next.js cache
- **Image Optimization**: Next.js Image component
- **Bundle Splitting**: Automatic code splitting

## Development Guidelines

### File Naming
- **Pages**: `page.tsx` (App Router convention)
- **Layouts**: `layout.tsx`
- **Components**: `PascalCase.tsx`
- **Utilities**: `kebab-case.ts`

### Import Organization
```typescript
// 1. React/Next.js imports
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

// 2. Third-party libraries
import { format } from 'date-fns';

// 3. Internal imports (absolute paths)
import { requireUserForServer } from '@/lib/auth.server';
import { Button } from '@/components/ui/button';

// 4. Relative imports
import './styles.css';
```

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

## Deployment

### Required Environment Variables

```bash
# Appwrite Configuration (Public - Client Side)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id

# Appwrite Configuration (Server Side)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key_here

# Appwrite Database
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_COLLECTION_ID=your_credentials_collection_id

# Application
# Use http://localhost:3000 for development
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
APP_COOKIE_SECRET=your-32-char-secret-here

# Encryption (auto-generated via pnpm generate-keys)
ENCRYPTION_KEY=your-encryption-key
```

**Critical Notes:**
- `APPWRITE_API_KEY`: Required for server-side database operations due to cross-domain limitation
- `APP_COOKIE_SECRET`: Must be 32+ characters, used for JOSE cookie signing
- `ENCRYPTION_KEY`: Generated via script, used for AES-256-GCM encryption

### Environment Setup
1. **Appwrite Instance**: Use Appwrite Cloud or self-hosted
2. **Database**: Create database and credentials collection
3. **API Key**: Generate API key with database read/write permissions
4. **Secrets**: Run `pnpm generate-keys` for encryption keys
5. **Domain**: Set up custom domain for production

### Build Process
```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Start production server
pnpm start
```

## Monitoring & Debugging

### Logging
- **Server-side**: Console logs in server actions
- **Client-side**: Minimal logging for user interactions
- **Errors**: Structured error handling with user feedback

### Performance Monitoring
- **Core Web Vitals**: Next.js built-in monitoring
- **Appwrite Analytics**: Backend performance metrics
- **Redmine API**: Monitor API response times

## Security Considerations

### Data Protection
- **Encryption at Rest**: All credentials encrypted
- **Transit Security**: HTTPS for all communications
- **Session Security**: Secure cookie configuration
- **Input Sanitization**: All user inputs validated

### Access Control
- **Authentication**: Dual cookie system (app_session + Appwrite sessions)
- **Authorization**: User-scoped queries on all database operations
- **Rate Limiting**: Built-in Appwrite protection
- **CSRF Protection**: SameSite=Lax cookie attributes
- **Token Swapping Prevention**: JWT double-check pattern for sensitive ops

