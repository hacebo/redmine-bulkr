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

## Authentication Flow

1. **Magic Link Request**: User enters email → Server sends magic link via Appwrite
2. **Email Verification**: User clicks link → Redirected to `/auth/callback`
3. **Session Creation**: Client component completes session in browser
4. **Protected Access**: Middleware validates session for protected routes

## Data Flow

### Redmine Integration

1. **Credential Storage**: User's Redmine credentials encrypted and stored in Appwrite
2. **API Authentication**: Server-side decryption for Redmine API calls
3. **Data Fetching**: Direct Redmine API integration (no local database)
4. **Time Entries**: Bulk creation and retrieval from Redmine

### Security

- **Encryption**: AES-256-GCM for API key storage
- **Session Management**: HTTP-only cookies via Appwrite
- **Server-Side**: All sensitive operations on server
- **Input Validation**: Zod schemas for all user inputs

## Component Patterns

### Server Components (Default)
```typescript
// app/(protected)/page.tsx
export default async function Page() {
  const user = await getServerUser();
  if (!user) redirect('/login');
  
  return <ServerComponent user={user} />;
}
```

### Client Components (When Needed)
```typescript
'use client';

export function InteractiveComponent() {
  const [state, setState] = useState();
  
  return <div>Interactive content</div>;
}
```

### Server Actions
```typescript
'use server';

export async function createTimeEntry(formData: FormData) {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  
  // Process data...
  return { success: true };
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
```typescript
// Authentication
const user = await account.get();

// Database
const docs = await databases.listDocuments(
  databaseId, 
  collectionId, 
  [Query.equal('userId', user.$id)]
);
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
import { getServerUser } from '@/lib/services/auth';
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

### Environment Setup
1. **Appwrite Instance**: Deploy or use cloud instance
2. **Database**: Create database and collections
3. **Environment Variables**: Configure all required vars
4. **Domain**: Set up custom domain for production

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
- **Authentication**: Appwrite session-based auth
- **Authorization**: User-scoped data access
- **Rate Limiting**: Built-in Appwrite protection
- **CSRF Protection**: SameSite cookie attributes
