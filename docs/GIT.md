# Git & Version Control

## What to Commit

### ✅ DO Commit
- `supabase/config.toml` - Shared local development config
- `supabase/migrations/` - Database migrations (if using Supabase migrations)
- `drizzle/` - Drizzle ORM migrations
- `.env.example` - Environment variable template
- All source code
- Documentation

### ❌ DON'T Commit
- `.env.local` - Your actual secrets
- `supabase/.temp/` - Temporary Supabase files
- `supabase/.branches/` - Supabase branch data
- `node_modules/` - Dependencies
- `.next/` - Build output

## Supabase Folder

The `supabase/` folder is created by `supabase init` and contains:

**Commit these:**
```
supabase/
  config.toml         ✅ Team shares this config
  migrations/         ✅ Database migrations (if any)
  functions/          ✅ Edge functions (if any)
  seed.sql            ✅ Seed data (if any)
```

**Don't commit these:**
```
supabase/
  .temp/              ❌ Temporary files
  .branches/          ❌ Branch-specific data
  *.local.toml        ❌ Local overrides
```

## Why Commit config.toml?

**Benefits:**
- Team uses same local setup
- Consistent ports across developers
- Shared auth configuration
- Email template settings

**What's in it:**
- Port configurations (54321, 54322, etc.)
- Auth settings (JWT expiry, etc.)
- Database settings
- Email settings

**Safe to commit because:**
- No secrets (uses default local keys)
- Only for local development
- Production uses Supabase cloud config

## Environment Variables

**Never commit:**
- Production encryption keys
- Production database URLs
- Production Supabase keys

**Always commit:**
- `.env.example` with placeholders
- Instructions for generating keys

## Best Practices

1. **Always** check `.gitignore` before committing
2. **Never** commit `.env.local`
3. **Do** commit `supabase/config.toml`
4. **Review** changes before `git add`
5. **Keep** secrets in environment variables only
