# Cross-Subdomain Session Sharing Configuration

## Overview

This authentication system supports sharing sessions across subdomains, allowing users to stay logged in when navigating between:
- `snaplabs.global`
- `dev.snaplabs.global`
- `www.snaplabs.global`
- `app.snaplabs.global`

## Configuration

### Environment Variables

Add the following to your `.env.local` (development) or production environment:

```bash
# Cross-subdomain cookie domain (note the leading dot)
NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global

# Optional: Custom cookie name (default: 'sb-auth-token')
NEXT_PUBLIC_COOKIE_NAME=sb-auth-token

# Optional: SameSite attribute (default: 'lax')
# Options: 'lax', 'strict', 'none'
NEXT_PUBLIC_COOKIE_SAME_SITE=lax
```

### Important Notes

1. **Leading Dot Required**: The cookie domain must start with a dot (`.`) to enable subdomain sharing
   - ✅ Correct: `.snaplabs.global`
   - ❌ Wrong: `snaplabs.global`

2. **HTTPS in Production**: For `sameSite='none'`, you must use HTTPS (`secure=true`)

3. **Development vs Production**:
   - Development: Can use HTTP with `secure=false`
   - Production: Must use HTTPS with `secure=true`

## How It Works

### Cookie Configuration

The system automatically configures cookies with:
- **Domain**: Set to parent domain (e.g., `.snaplabs.global`)
- **SameSite**: `lax` (allows top-level navigations)
- **Secure**: `true` in production, `false` in development

### Session Flow

1. User logs in on `dev.snaplabs.global`
2. Cookie is set with domain `.snaplabs.global`
3. User navigates to `www.snaplabs.global`
4. Cookie is automatically sent (same parent domain)
5. User remains authenticated

## Verification

### Check Configuration

Visit `/api/config/session` to verify your configuration:

```bash
curl http://localhost:3002/api/config/session
```

Response:
```json
{
  "configured": true,
  "cookieDomain": ".snaplabs.global",
  "cookieName": "sb-auth-token",
  "sameSite": "lax",
  "secure": false,
  "environment": "development",
  "validationError": null
}
```

### Test Cross-Subdomain Sharing

1. Set up local hosts file entries:
   ```
   127.0.0.1 dev.localhost
   127.0.0.1 www.localhost
   ```

2. Configure `.env.local`:
   ```bash
   NEXT_PUBLIC_COOKIE_DOMAIN=.localhost
   ```

3. Start dev server:
   ```bash
   pnpm dev
   ```

4. Test flow:
   - Login on `http://dev.localhost:3002`
   - Navigate to `http://www.localhost:3002`
   - Should remain authenticated

## Troubleshooting

### Session Not Shared Across Subdomains

**Problem**: User logged in on one subdomain but not authenticated on another

**Solutions**:
1. Verify `NEXT_PUBLIC_COOKIE_DOMAIN` starts with a dot
2. Check browser DevTools → Application → Cookies
3. Ensure cookie domain matches parent domain
4. Verify `sameSite` and `secure` settings are compatible

### Cookie Not Set

**Problem**: Cookie is not being created

**Solutions**:
1. Check browser console for errors
2. Verify Supabase environment variables are set
3. Check middleware is running correctly
4. Ensure cookies are not blocked by browser settings

### Validation Errors

**Problem**: Configuration validation fails

**Solutions**:
1. Check `/api/config/session` endpoint for validation errors
2. Ensure cookie domain format is correct (leading dot)
3. Verify `sameSite` value is one of: `lax`, `strict`, `none`
4. If `sameSite='none'`, ensure `secure=true` (HTTPS)

## API Reference

### Configuration Functions

```typescript
import { getCrossDomainSessionConfig } from '@/config/cross-domain-session'

const config = getCrossDomainSessionConfig()
// Returns: { cookieDomain, cookieName, sameSite, secure }
```

### Validation

```typescript
import { validateCrossDomainSessionConfig } from '@/config/cross-domain-session'

const error = validateCrossDomainSessionConfig()
// Returns: null if valid, error message if invalid
```

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production to protect session cookies
2. **SameSite Policy**: Use `lax` for most cases, `strict` for maximum security
3. **Cookie Domain**: Only set to parent domain, never to unrelated domains
4. **Secure Flag**: Always `true` in production environments

## Example Configurations

### Single Domain (No Cross-Subdomain Sharing)

```bash
# Leave NEXT_PUBLIC_COOKIE_DOMAIN unset or empty
# Cookies will only work on the exact domain
```

### Development with Localhost

```bash
NEXT_PUBLIC_COOKIE_DOMAIN=.localhost
NEXT_PUBLIC_COOKIE_SAME_SITE=lax
# secure will be false automatically in development
```

### Production with Multiple Subdomains

```bash
NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global
NEXT_PUBLIC_COOKIE_SAME_SITE=lax
# secure will be true automatically in production
```
