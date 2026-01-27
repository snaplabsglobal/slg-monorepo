# Authentication System Documentation

## Overview

A complete authentication system for `slg-corporate` built with Supabase Auth, Next.js 16, and shadcn/ui components. The system supports Email/Password authentication with cross-subdomain session sharing capabilities.

## Features

✅ **Email/Password Authentication**
- User registration with email verification
- Secure login with password validation
- Session management via Supabase Auth

✅ **Route Protection**
- Next.js Middleware protects `/dashboard` route
- Automatic redirect to `/login` for unauthenticated users
- Session refresh handling

✅ **UI Components**
- Built with shadcn/ui
- Follows "建筑蓝" (Architectural Blue) and "活力橙" (Vibrant Orange) color scheme
- Responsive design

✅ **Cross-Subdomain Session Sharing**
- Configurable cookie domain for subdomain sharing
- API endpoint for configuration verification
- Comprehensive documentation

## File Structure

```
apps/slg-corporate/
├── app/
│   ├── api/
│   │   └── config/
│   │       └── session/
│   │           └── route.ts          # Session config API
│   ├── auth/
│   │   └── signout/
│   │       └── route.ts              # Sign out handler
│   ├── components/
│   │   └── ui/                        # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   ├── config/
│   │   └── cross-domain-session.ts    # Cross-domain config
│   ├── dashboard/
│   │   └── page.tsx                   # Protected dashboard
│   ├── login/
│   │   └── page.tsx                   # Login page
│   ├── register/
│   │   └── page.tsx                   # Registration page
│   ├── types/
│   │   └── supabase.ts                # TypeScript types
│   └── utils/
│       ├── cn.ts                      # Class name utility
│       └── supabase/
│           ├── client.ts              # Browser client
│           ├── server.ts              # Server client
│           └── middleware.ts          # Middleware client
├── middleware.ts                      # Route protection
└── docs/
    ├── AUTHENTICATION_SYSTEM.md        # This file
    └── CROSS_DOMAIN_SESSION.md        # Cross-domain docs
```

## Usage

### 1. Login

Visit `/login` to sign in with email and password.

**Features:**
- Email validation
- Password validation
- Error handling
- Loading states
- Redirect to dashboard on success

### 2. Register

Visit `/register` to create a new account.

**Features:**
- Email validation
- Password strength validation (min 8 characters)
- Password confirmation
- Email verification support
- Automatic sign-in after registration (if email confirmation disabled)

### 3. Dashboard

Protected route at `/dashboard` - requires authentication.

**Features:**
- User information display
- Sign out functionality
- Product cards (LedgerSnap, JobSite Snap)
- Account settings placeholder

### 4. Sign Out

POST to `/auth/signout` or use the sign out button in dashboard.

## Configuration

### Environment Variables

Required in `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Cross-Subdomain Session Sharing
NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global
NEXT_PUBLIC_COOKIE_SAME_SITE=lax
```

### Cross-Subdomain Session Sharing

See [CROSS_DOMAIN_SESSION.md](./CROSS_DOMAIN_SESSION.md) for detailed configuration.

**Quick Setup:**
1. Set `NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global` (note the leading dot)
2. Cookies will be shared across all subdomains
3. Verify configuration at `/api/config/session`

## Color Scheme

### 建筑蓝 (Architectural Blue) - Primary
- Default: `#1E40AF`
- Dark: `#1E3A8A`
- Light: `#3B82F6`
- Used for: Primary buttons, links, brand elements

### 活力橙 (Vibrant Orange) - Accent
- Default: `#F97316`
- Dark: `#EA580C`
- Light: `#FB923C`
- Used for: Secondary buttons, highlights, CTAs

## API Endpoints

### GET `/api/config/session`

Returns current cross-domain session configuration (non-sensitive).

**Response:**
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

### POST `/auth/signout`

Signs out the current user and redirects to login page.

## Middleware Protection

The `middleware.ts` file protects routes by:
1. Checking user authentication status
2. Redirecting unauthenticated users to `/login`
3. Redirecting authenticated users away from auth pages
4. Refreshing expired sessions

**Protected Routes:**
- `/dashboard` and all sub-routes

**Public Routes:**
- `/login`
- `/register`
- `/` (homepage)

## Development

### Running Locally

```bash
cd apps/slg-corporate
pnpm dev
```

Visit `http://localhost:3002`

### Building

```bash
pnpm build
```

### Testing Authentication Flow

1. Start dev server
2. Visit `/register` to create an account
3. Visit `/login` to sign in
4. Access `/dashboard` (should be protected)
5. Test sign out functionality

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production
2. **Password Validation**: Minimum 8 characters enforced
3. **Session Management**: Sessions managed by Supabase Auth
4. **Cookie Security**: Secure flag enabled in production
5. **Route Protection**: Middleware enforces authentication

## Troubleshooting

### Cannot Access Dashboard

**Problem**: Redirected to login even after signing in

**Solutions:**
1. Check Supabase environment variables are set
2. Verify middleware is running
3. Check browser console for errors
4. Verify session cookies are being set

### Session Not Persisting

**Problem**: User logged out after page refresh

**Solutions:**
1. Check cookie domain configuration
2. Verify Supabase session is valid
3. Check middleware session refresh logic
4. Verify browser allows cookies

### Build Errors

**Problem**: TypeScript or module resolution errors

**Solutions:**
1. Verify `tsconfig.json` paths configuration
2. Check `next.config.mjs` webpack alias setup
3. Ensure all dependencies are installed
4. Run `pnpm install` to update dependencies

## Next Steps

1. **Email Verification**: Configure Supabase email templates
2. **Password Reset**: Add forgot password functionality
3. **Social Auth**: Add OAuth providers (Google, GitHub, etc.)
4. **User Profile**: Create user profile management page
5. **Role-Based Access**: Implement role-based route protection

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Cross-Domain Session Guide](./CROSS_DOMAIN_SESSION.md)
