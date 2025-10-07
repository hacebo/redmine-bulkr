# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Appwrite instance (cloud or self-hosted)
- Domain name (for production)
- SSL certificate (automatic with most hosting platforms)

## Environment Setup

### 1. Appwrite Instance

#### Option A: Appwrite Cloud (Recommended)
1. Go to [Appwrite Cloud](https://cloud.appwrite.io/)
2. Create a new project
3. Note your Project ID and Endpoint URL

#### Option B: Self-Hosted Appwrite
1. Follow [Appwrite Self-Hosting Guide](https://appwrite.io/docs/installation)
2. Set up your Appwrite instance
3. Create a new project

### 2. Database Setup

Follow the complete setup guide in [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) to:
- Create the database
- Set up the collection with proper attributes
- Configure permissions
- Create indexes

### 3. Environment Variables

Create `.env.local` for development or configure environment variables in your hosting platform:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_COLLECTION_ID=your-collection-id

# Appwrite Admin (Server-side only)
APPWRITE_API_KEY=your-admin-api-key

# Encryption Key (Generate with: node scripts/generate-keys.js)
CRYPTO_KEY_BASE64=your-encryption-key

# App URL (for magic links)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Vercel KV (Upstash Redis) - For rate limiting
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token
REDIS_HASH_SECRET=your-redis-hash-secret

# Sentry - Error tracking (optional but recommended)
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required environment variables
   - Redeploy after adding variables

3. **Custom Domain** (Optional)
   - Add your domain in Vercel Dashboard
   - Update `NEXT_PUBLIC_APP_URL` with your domain

### Option 2: Netlify

1. **Build Settings**
   ```toml
   # netlify.toml
   [build]
     command = "pnpm build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   ```

2. **Deploy**
   - Connect your Git repository
   - Configure environment variables
   - Deploy

### Option 3: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install
   
   COPY . .
   RUN pnpm build
   
   EXPOSE 3000
   CMD ["pnpm", "start"]
   ```

2. **Build and Deploy**
   ```bash
   docker build -t redmine-bulkr .
   docker run -p 3000:3000 redmine-bulkr
   ```

### Option 4: Self-Hosted VPS

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install pnpm
   npm install -g pnpm
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo>
   cd redmine-bulkr
   
   # Install dependencies
   pnpm install
   
   # Build application
   pnpm build
   
   # Start with PM2
   npm install -g pm2
   pm2 start "pnpm start" --name redmine-bulkr
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Post-Deployment Checklist

### 1. Appwrite Configuration
- [ ] Project ID and endpoint configured
- [ ] Database and collection created
- [ ] Collection permissions set correctly
- [ ] Indexes created on `userId` field

### 2. Authentication Setup
- [ ] Magic link email provider configured
- [ ] Redirect URLs set in Appwrite
- [ ] Domain whitelisted in Appwrite

### 3. Security
- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] Admin API key protected (server-side only)
- [ ] Encryption key generated and secured

### 4. Testing
- [ ] User registration works
- [ ] Magic link authentication works
- [ ] Redmine connection test passes
- [ ] Time entry creation works
- [ ] Bulk time entry works

## Monitoring

### 1. Application Monitoring
- **Sentry**: Error tracking and performance monitoring (recommended - see [Sentry Setup](./SENTRY.md))
- **Vercel**: Built-in analytics and performance monitoring
- **Netlify**: Analytics and form submissions

### 2. Appwrite Monitoring
- Monitor API usage in Appwrite Dashboard
- Check database performance
- Review authentication logs

### 3. Redmine Integration
- Monitor API response times
- Check for rate limiting
- Verify data synchronization

### 4. Sentry Dashboard
- Track error rates and trends
- Monitor performance metrics
- View user-impacted issues
- Set up alerts for critical errors

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```
Error: User (role: guests) missing scopes (["account"])
```
**Solution**: Ensure you're using `requireUserForServer()` in server actions and `requireUserForPage()` in server components

#### 2. Magic Link Not Working
```
Error: Invalid magic URL session
```
**Solution**: 
- Check `NEXT_PUBLIC_APP_URL` matches your domain
- Verify redirect URLs in Appwrite
- Ensure HTTPS is enabled

#### 3. Redmine Connection Failed
```
Error: Collection ID does not exist
```
**Solution**:
- Verify Appwrite collection is created
- Check `APPWRITE_COLLECTION_ID` environment variable
- Ensure collection permissions allow user access

#### 4. Build Failures
```
Error: Module not found
```
**Solution**:
- Check import paths are correct
- Verify all dependencies installed
- Clear `.next` folder and rebuild

### Performance Issues

#### 1. Slow Loading
- Enable Appwrite caching
- Optimize images with Next.js Image component
- Use Suspense boundaries for progressive loading

#### 2. API Timeouts
- Increase timeout settings
- Implement retry logic
- Consider caching frequently accessed data

## Backup and Recovery

### 1. Database Backup
- Appwrite provides automatic backups for cloud instances
- For self-hosted, backup your Appwrite data directory

### 2. Application Backup
- Keep your source code in version control
- Document environment variable configurations
- Backup encryption keys securely

### 3. Recovery Plan
1. Restore Appwrite instance
2. Recreate database and collections
3. Deploy application code
4. Configure environment variables
5. Test functionality

## Scaling Considerations

### 1. Appwrite Scaling
- Appwrite Cloud handles scaling automatically
- Self-hosted: Consider load balancing for multiple instances

### 2. Application Scaling
- Next.js supports horizontal scaling
- Consider CDN for static assets
- Implement caching strategies

### 3. Redmine Integration
- Monitor API rate limits
- Consider batch operations for bulk entries
- Implement proper error handling and retries
