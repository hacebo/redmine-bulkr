# Deployment Guide

## Vercel Deployment

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Wait for database to provision
4. Get credentials from Project Settings > API

### 2. Configure Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### 3. Set Environment Variables

In Vercel Dashboard > Settings > Environment Variables:

```env
DATABASE_URL=<supabase-connection-string>
CRYPTO_KEY_BASE64=<generate-new-key-for-production>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

**Important:** Generate a NEW `CRYPTO_KEY_BASE64` for production!

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Configure Supabase

In Supabase Dashboard > Authentication > URL Configuration:

**Site URL:**
```
https://your-app.vercel.app
```

**Redirect URLs:**
```
https://your-app.vercel.app/auth/callback
```

### 5. Configure Email Provider

In Supabase Dashboard > Authentication > Email Templates:

1. Choose email provider (SendGrid, AWS SES, etc.)
2. Configure SMTP settings
3. Customize magic link email template

### 6. Run Database Migrations

```powershell
# Connect to production database
pnpm db:push
```

### 7. Deploy

```bash
vercel --prod
```

## Other Platforms

### Netlify

Similar to Vercel:
1. Connect GitHub repo
2. Set environment variables
3. Build command: `pnpm build`
4. Output directory: `.next`

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## Post-Deployment

### 1. Test Authentication
- Send magic link
- Verify email delivery
- Test login flow

### 2. Test Redmine Integration
- Configure credentials
- Fetch projects
- Create time entry

### 3. Monitor
- Check error logs
- Monitor performance
- Watch for failed requests

## Security Checklist

- [ ] HTTPS enabled
- [ ] New encryption key generated
- [ ] Environment variables secure
- [ ] Email provider configured
- [ ] Supabase redirect URLs set
- [ ] Database migrations run
- [ ] Test authentication flow
- [ ] Verify API key encryption
