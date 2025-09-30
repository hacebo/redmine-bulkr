# Security Documentation

## Authentication

### Supabase Magic Links
- Passwordless authentication
- Email-based OTP
- JWT tokens in HTTP-only cookies
- Automatic session refresh

### Session Security
- **HTTP-Only**: Cookies not accessible via JavaScript
- **Secure**: HTTPS-only in production
- **SameSite**: CSRF protection
- **Expiry**: Managed by Supabase (default 1 hour)

## Credential Encryption

### AES-256-GCM
- **Algorithm**: AES-256 in GCM mode
- **Key Size**: 256 bits (32 bytes)
- **IV**: 12 bytes random (unique per encryption)
- **Auth Tag**: 16 bytes (prevents tampering)

### Storage
```
redmine_credentials table:
- api_key_enc: base64(encrypted_api_key)
- iv: base64(initialization_vector)
- tag: base64(authentication_tag)
```

### Decryption
- **Server-only**: Never in browser
- **In-memory**: Only during API calls
- **Immediate disposal**: After use

## Data Protection

### User Isolation
- All queries filter by authenticated user ID
- Redmine API calls include user_id parameter
- No cross-user data access

### Input Validation
- Zod schemas on all inputs
- Server-side validation
- Type-safe operations

### SQL Injection Prevention
- Drizzle ORM with parameterized queries
- No raw SQL with user input

## Production Security

### Required for Production
1. **HTTPS**: Enable SSL/TLS
2. **Environment Variables**: Secure secrets management
3. **Email Provider**: Configure in Supabase
4. **Rate Limiting**: Consider adding
5. **Monitoring**: Set up error tracking

### Recommended
- Audit logging
- CSP headers
- 2FA support
- Session timeout notifications

## Security Checklist

- [x] Encrypted credentials at rest
- [x] HTTP-only session cookies
- [x] Server-side authentication
- [x] Input validation
- [x] User data isolation
- [x] SQL injection prevention
- [x] XSS prevention
- [x] CSRF protection
- [ ] Rate limiting
- [ ] Audit logging
- [ ] CSP headers
