# API Documentation

## Server Actions

All server actions are located in `app/lib/actions/` and marked with `'use server'`.

### Projects

#### getProjects()
```typescript
export async function getProjects(): Promise<Project[]>
```

Returns list of accessible Redmine projects for authenticated user.

**Cached:** 5 minutes

### Activities

#### getActivities()
```typescript
export async function getActivities(): Promise<Activity[]>
```

Returns list of time entry activities from Redmine.

**Cached:** 5 minutes

### Time Entries

#### createBulkTimeEntries(formData: FormData)
```typescript
export async function createBulkTimeEntries(formData: FormData)
```

Creates multiple time entries in Redmine.

**Parameters:**
- `formData.entries`: JSON array of time entries

**Validation:**
- Project ID required
- Activity ID required
- Date in YYYY-MM-DD format
- Hours: 0-24 per day

**Returns:**
```typescript
{ success: boolean, timeEntries: any[] }
```

#### getMonthlyTimeEntries(monthStart: string, monthEnd: string)
```typescript
export async function getMonthlyTimeEntries(
  monthStart: string,
  monthEnd: string
): Promise<TimeEntry[]>
```

Fetches time entries for date range.

**Filters:**
- Current user only
- Specified date range
- All projects

## Redmine Settings Actions

Located in `app/(protected)/settings/redmine/actions.ts`

#### saveRedmineCredentialAction(formData: FormData)
```typescript
export async function saveRedmineCredentialAction(formData: FormData)
```

Saves or updates encrypted Redmine credentials.

**Parameters:**
- `baseUrl`: Redmine instance URL
- `apiKey`: Redmine API key

**Process:**
1. Validates API key against Redmine
2. Encrypts with AES-256-GCM
3. Stores in database
4. Redirects to time tracking

**Security:**
- Validates against `/my/account.json`
- Server-side only
- API key never sent to client

## Account Actions

Located in `app/(protected)/settings/account/actions.ts`

#### deleteAccountAction()
```typescript
export async function deleteAccountAction()
```

Permanently deletes user account and all data.

**Deletes from BulkRedmine:**
- User account record (local database)
- Encrypted Redmine credentials (local database)
- Supabase authentication session

**Does NOT delete from Redmine:**
- Time entries (all your logged hours remain in Redmine)
- Redmine user account (your Redmine account is unaffected)
- Projects, activities, or any Redmine data

## Service Layer

### getRedmineClientForUser(userId: string)
```typescript
export async function getRedmineClientForUser(
  userId: string
): Promise<{ client: RedmineService; redmineUserId: number }>
```

Creates authenticated Redmine client for user.

**Process:**
1. Fetch encrypted credentials
2. Decrypt API key (server-side)
3. Create RedmineService instance
4. Return client + Redmine user ID

**Security:** Decryption only happens on server

## Type Definitions

### User
```typescript
interface User {
  id: string;
  email: string;
  name?: string | null;
}
```

### Project
```typescript
interface Project {
  id: number;
  name: string;
  identifier: string;
}
```

### Activity
```typescript
interface Activity {
  id: number;
  name: string;
  is_default: boolean;
}
```

### TimeEntry
```typescript
interface TimeEntry {
  id: number;
  projectId: number;
  activityId: number;
  activityName: string;
  date: string; // YYYY-MM-DD
  hours: number;
  comments: string;
  syncedToRedmine: boolean;
}
```
