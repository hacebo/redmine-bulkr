# Setup Guide - BulkRedmine

## Prerequisites

- Node.js 18+
- pnpm
- Supabase CLI (`npm install -g supabase`)

## Quick Setup

### 1. Start Supabase

```powershell
supabase start
```

This will output your local Supabase credentials.

### 2. Setup Environment

```powershell
# Copy example env file
Copy-Item .env.example .env.local

# Generate encryption key
pnpm generate-keys
```

Update `.env.local` with:
- `CRYPTO_KEY_BASE64` from generate-keys output
- Supabase credentials from `supabase start` output

### 3. Install Dependencies

```powershell
pnpm install
```

### 4. Initialize Database

```powershell
# Push schema to database
pnpm db:push
```

### 5. Start Application

```powershell
pnpm dev
```

Open http://localhost:3000

## First Login

1. Enter your email at `/login`
2. Check http://127.0.0.1:54324 (Inbucket) for magic link
3. Click magic link
4. Configure Redmine at `/settings/redmine`
5. Start tracking time!

## Troubleshooting

### Supabase Issues

```powershell
# Check status
supabase status

# Stop and restart
supabase stop
supabase start
```

### Database Issues

```powershell
# Reset database
pnpm db:push

# Check tables
docker exec -it supabase_db_web psql -U postgres -d postgres -c "\dt"
```

### Port Conflicts

If port 54322 is in use:
1. Stop other Supabase instances: `supabase stop --project-id <other-project>`
2. Or configure different ports in `supabase/config.toml`
