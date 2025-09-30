# Architecture Documentation

## Overview

BulkRedmine uses a modern server-first architecture with Next.js 15 App Router and Supabase authentication.

## Authentication Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. Email
     ▼
┌─────────────┐
│   Supabase  │ 2. Magic Link
│    Auth     │
└──────┬──────┘
       │ 3. Click Link
       ▼
┌─────────────┐
│ /auth/      │ 4. Verify & Create Session
│  callback   │
└──────┬──────┘
       │ 5. JWT Cookie
       ▼
┌─────────────┐
│ Protected   │
│   Routes    │
└─────────────┘
```

## Data Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ Request (with JWT cookie)
     ▼
┌──────────┐
│Middleware│ Validates session
└────┬─────┘
     │ Authorized
     ▼
┌──────────────┐
│Server Action │ getCurrentUser()
└──────┬───────┘
       │ user.id
       ▼
┌────────────────┐
│CredentialStore │ Get encrypted credentials
└────────┬───────┘
         │ {encB64, ivB64, tagB64}
         ▼
┌────────────┐
│   Crypto   │ Decrypt (server-only)
└──────┬─────┘
       │ API Key
       ▼
┌────────────┐
│  Redmine   │ API Call
│    API     │
└──────┬─────┘
       │ Data
       ▼
┌──────────┐
│  Client  │
└──────────┘
```

## Project Structure

```
app/
  (auth)/              # Public routes (no auth required)
    login/
  (protected)/         # Protected routes (auth required)
    time-tracking/
    bulk-entry/
    settings/
  auth/callback/       # Auth callback handler
  lib/                 # Server-side code
    actions/           # Server actions
    services/          # Business logic
    types/             # TypeScript types

lib/                   # Shared utilities
  crypto.ts            # Encryption
  db.ts                # Database
  schema.ts            # Schema
  supabase/            # Supabase clients

components/            # React components
  app-sidebar.tsx
  dashboard/
  time-entry/
  ui/                  # ShadCN components
```

## Component Architecture

### Server Components (Default)
- Data fetching
- Supabase auth checks
- Database queries
- No client JS

### Client Components (Marked with 'use client')
- Interactive forms
- User interactions
- State management
- React hooks

### Server Actions (Marked with 'use server')
- Data mutations
- API calls to Redmine
- Authentication required
- Zod validation

## Database Schema

```sql
users:
  - id (Supabase auth.users.id)
  - email
  - name
  - created_at
  - updated_at

redmine_credentials:
  - id
  - user_id (FK to users.id)
  - base_url
  - redmine_user_id
  - api_key_enc (encrypted)
  - iv (encryption IV)
  - tag (auth tag)
  - created_at
  - updated_at
```

## Caching Strategy

### Cached Data
- Projects (5 minutes)
- Activities (5 minutes)
- User-specific tags

### Not Cached
- Time entries (real-time)
- User sessions
- Redmine API validation

## Mobile Strategy

### Detection
```typescript
useIsMobile() // <768px = mobile
```

### Rendering
- Desktop: Grid layout (14 columns)
- Mobile: Vertical list (1 column)
- Completely different UIs

## Security Layers

1. **Route Protection** - Middleware
2. **Authentication** - getCurrentUser()
3. **Authorization** - User ID validation
4. **Input Validation** - Zod schemas
5. **Output Sanitization** - React auto-escapes
6. **Encryption** - AES-256-GCM
