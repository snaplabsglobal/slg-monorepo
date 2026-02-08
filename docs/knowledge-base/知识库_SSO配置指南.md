# Single Sign-On (SSO) Configuration Guide

## Overview

All three SnapLabs Global applications (slg-corporate, ls-web, jss-web) share the same Supabase authentication project, enabling Single Sign-On (SSO) across subdomains.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Single Supabase Project                        │
│  (Shared Authentication & User Database)                 │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ slg-      │ │ ls-web    │ │ jss-web   │
│ corporate │ │ (LS)      │ │ (JSS)     │
│           │ │           │ │           │
│ 管理后台   │ │ 财务应用   │ │ 工地应用   │
└───────────┘ └───────────┘ └───────────┘
```

## Configuration

### 1. Environment Variables

All three applications must use the **same Supabase project** credentials:

```bash
# .env.local (for each app)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Cross-subdomain cookie sharing
NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global
NEXT_PUBLIC_COOKIE_SAME_SITE=lax
```

### 2. Cookie Domain Configuration

For SSO to work across subdomains, configure the cookie domain:

```bash
# Example: Share cookies across all subdomains
NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global
```

This allows:
- `dev.snaplabs.global`
- `www.snaplabs.global`
- `app.snaplabs.global`
- `ledgersnap.app`
- `jobsitesnap.app`

All to share the same authentication session.

### 3. Application-Specific Settings

#### slg-corporate (Management Portal)
- **Registration**: Closed (invitation-only)
- **Theme**: Balanced (Architectural Blue + Vibrant Orange)

#### ls-web (LedgerSnap)
- **Registration**: Open
- **Theme**: Architectural Blue (financial rigor)

#### jss-web (JobSite Snap)
- **Registration**: Open
- **Theme**: Vibrant Orange (energy, action)

## How SSO Works

### Session Flow

1. **User logs in on any app** (e.g., `ledgersnap.app`)
2. **Supabase creates session** and stores in cookie
3. **Cookie domain set** to parent domain (`.snaplabs.global`)
4. **User navigates to another app** (e.g., `jobsitesnap.app`)
5. **Cookie automatically sent** (same parent domain)
6. **User remains authenticated** ✅

### Implementation Details

All apps use `@slo/snap-auth` package which:
- Uses the same Supabase client configuration
- Shares cookie domain settings
- Implements consistent middleware logic
- Provides unified authentication components

## Testing SSO

### Local Development

1. **Set up local hosts**:
   ```bash
   # /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
   127.0.0.1 dev.localhost
   127.0.0.1 ls.localhost
   127.0.0.1 jss.localhost
   ```

2. **Configure environment**:
   ```bash
   # .env.local
   NEXT_PUBLIC_COOKIE_DOMAIN=.localhost
   ```

3. **Test flow**:
   - Start `ls-web` on port 3000
   - Start `jss-web` on port 3001
   - Login on `http://ls.localhost:3000`
   - Navigate to `http://jss.localhost:3001`
   - Should remain authenticated ✅

### Production Testing

1. **Deploy all apps** with same Supabase project
2. **Configure cookie domain** (e.g., `.snaplabs.global`)
3. **Test cross-app navigation**:
   - Login on `ledgersnap.app`
   - Navigate to `jobsitesnap.app`
   - Should remain authenticated ✅

## Troubleshooting

### Session Not Shared

**Problem**: User logged in on one app but not authenticated on another

**Solutions**:
1. Verify all apps use the same `NEXT_PUBLIC_SUPABASE_URL`
2. Check `NEXT_PUBLIC_COOKIE_DOMAIN` is set correctly (with leading dot)
3. Ensure cookies are not blocked by browser
4. Check browser DevTools → Application → Cookies

### Cookie Domain Issues

**Problem**: Cookies not being set or shared

**Solutions**:
1. Verify cookie domain format: `.snaplabs.global` (leading dot required)
2. Check `sameSite` setting: `lax` for most cases
3. Ensure `secure` flag is `true` in production (HTTPS required)
4. Verify parent domain matches across all subdomains

### Middleware Not Working

**Problem**: Routes not protected or redirects not working

**Solutions**:
1. Verify middleware file exists in app root
2. Check middleware matcher configuration
3. Ensure `@slo/snap-auth` is installed
4. Verify Supabase environment variables are set

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production for secure cookies
2. **Cookie Domain**: Only set to parent domain, never to unrelated domains
3. **SameSite Policy**: Use `lax` for most cases, `strict` for maximum security
4. **Session Expiry**: Supabase handles session expiration automatically

## Migration Checklist

When setting up SSO for the first time:

- [ ] All apps use same Supabase project
- [ ] Environment variables configured in all apps
- [ ] Cookie domain set for cross-subdomain sharing
- [ ] Middleware configured in all apps
- [ ] Test login flow on each app
- [ ] Test cross-app navigation
- [ ] Verify session persistence
- [ ] Test logout (should log out from all apps)

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Cross-Domain Session Guide](../apps/slg-corporate/docs/CROSS_DOMAIN_SESSION.md)
- [Authentication System Docs](../apps/slg-corporate/docs/AUTHENTICATION_SYSTEM.md)
