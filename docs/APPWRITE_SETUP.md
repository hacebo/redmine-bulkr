# Appwrite Setup Guide

This guide explains how to set up Appwrite for the Redmine-Bulkr application.

## Local Development Setup

### 1. Start Appwrite Services

```bash
docker-compose up -d
```

This will start:
- Appwrite server (http://localhost)
- MariaDB database
- Redis cache
- ClamAV antivirus
- InfluxDB metrics
- Mailpit (http://localhost:8025) for email testing

### 2. Configure Appwrite Project

1. Open http://localhost in your browser
2. Create a new project called "Redmine-Bulkr"
3. Note your Project ID from the Settings tab

### 3. Set Up Database

1. Go to **Database** section
2. Create a new database called "redmine-bulkr"
3. Note the Database ID

### 4. Create Redmine Credentials Collection

Create a collection called "redmine_credentials" with the following attributes:

| Attribute | Type | Size | Required | Default | Array |
|-----------|------|------|----------|---------|-------|
| userId | String | 255 | Yes | - | No |
| baseUrl | String | 255 | Yes | - | No |
| apiKeyEnc | String | 500 | Yes | - | No |
| iv | String | 100 | Yes | - | No |
| tag | String | 100 | Yes | - | No |
| redmineUserId | String | 50 | No | - | No |

**Note:** The `redmineUserId` field stores the Redmine user ID to avoid API calls for user identification. It's automatically populated when credentials are saved.

**Indexes:**
- Create an index on `userId` for fast lookups

**Permissions:**
- Create: Authenticated users only
- Read: User can only read their own documents
- Update: User can only update their own documents
- Delete: User can only delete their own documents

### 5. Configure Authentication

1. Go to **Auth** section
2. Enable **Email/Password** authentication
3. Enable **Magic URL** authentication
4. Configure email templates if needed

### 6. Environment Variables

Create a `.env.local` file with:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=http://localhost/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_COLLECTION_ID=your-collection-id

# Encryption Key for API Keys
CRYPTO_KEY_BASE64=your-32-byte-base64-encryption-key

# Email Configuration (for local development)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@localhost

# Cloudflare Turnstile (optional)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Production Setup

### 1. Appwrite Cloud

1. Sign up at https://cloud.appwrite.io
2. Create a new project
3. Follow similar database and collection setup as above

### 2. Environment Variables

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_COLLECTION_ID=your-collection-id

# Encryption Key for API Keys
CRYPTO_KEY_BASE64=your-32-byte-base64-encryption-key

# Email Configuration (Appwrite Cloud handles SMTP)
# No additional SMTP configuration needed

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Security Considerations

### 1. Collection Permissions

The `redmine_credentials` collection should have strict permissions:

```javascript
// Create permission
"users"
// Read permission
"users"
// Update permission
"users"
// Delete permission
"users"
```

### 2. Document-Level Security

Each document should be scoped to the authenticated user:

```javascript
// Query filter
[Query.equal('userId', '$APPWRITE_USER_ID')]
```

### 3. Encryption

- API keys are encrypted using AES-256-GCM before storage
- Encryption keys should be rotated regularly in production
- Never commit encryption keys to version control

## Testing Email Functionality

### Local Development

1. Start the docker-compose services
2. Open Mailpit at http://localhost:8025
3. Send magic links or verification emails
4. Check Mailpit for captured emails

### Production

- Configure SMTP settings in Appwrite Console
- Test with real email addresses
- Monitor email delivery logs

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure docker-compose services are running
2. **Invalid project ID**: Check your environment variables
3. **Permission denied**: Verify collection permissions and user authentication
4. **Email not sending**: Check SMTP configuration in Appwrite Console

### Collection Permissions

The `redmine_credentials` collection requires proper permissions for users to manage their own credentials:

#### Required Permissions:
- **CREATE**: `users()` - Allow authenticated users to create credentials
- **READ**: `users()` - Allow authenticated users to read credentials  
- **UPDATE**: `users()` - Allow authenticated users to update credentials
- **DELETE**: `users()` - Allow authenticated users to delete credentials

#### Row-Level Security (Recommended):
1. Enable **Row Security** in collection settings
2. Set table-level permissions as above
3. When creating documents, row-level permissions are automatically set:
   ```javascript
   Permission.read(Role.user(user.$id))
   Permission.update(Role.user(user.$id))
   Permission.delete(Role.user(user.$id))
   ```

### Debug Mode

Enable debug logging by setting:

```env
_APP_LOGGING_LEVEL=debug
```

## Migration from Supabase

If migrating from Supabase:

1. Export existing credentials from Supabase
2. Re-encrypt with new encryption key
3. Import to Appwrite collection
4. Update environment variables
5. Test authentication flow
6. Verify credential storage and retrieval
