/**
 * Cross-Subdomain Session Sharing Configuration
 * 
 * This configuration enables session sharing across subdomains
 * (e.g., snaplabs.global, dev.snaplabs.global, www.snaplabs.global)
 * 
 * Usage:
 * 1. Set NEXT_PUBLIC_COOKIE_DOMAIN in your .env.local or production environment
 * 2. Format: '.snaplabs.global' (note the leading dot for subdomain sharing)
 * 3. The cookie will be accessible across all subdomains
 * 
 * Example:
 * NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global
 * 
 * This allows:
 * - dev.snaplabs.global
 * - www.snaplabs.global
 * - app.snaplabs.global
 * 
 * All to share the same authentication session.
 */

export interface CrossDomainSessionConfig {
  /**
   * Cookie domain for cross-subdomain sharing
   * Set to parent domain with leading dot (e.g., '.snaplabs.global')
   * Leave undefined for single-domain usage
   */
  cookieDomain: string | undefined

  /**
   * Cookie name for authentication token
   */
  cookieName: string

  /**
   * SameSite attribute for cookies
   * 'lax' - Allows cookies in top-level navigations and same-site requests
   * 'strict' - Only sends cookies in same-site requests
   * 'none' - Allows cross-site cookies (requires Secure flag)
   */
  sameSite: 'lax' | 'strict' | 'none'

  /**
   * Secure flag for cookies
   * true - Only send cookies over HTTPS (production)
   * false - Allow cookies over HTTP (development)
   */
  secure: boolean
}

/**
 * Get cross-domain session configuration from environment variables
 */
export function getCrossDomainSessionConfig(): CrossDomainSessionConfig {
  return {
    cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
    cookieName: process.env.NEXT_PUBLIC_COOKIE_NAME || 'sb-auth-token',
    sameSite: (process.env.NEXT_PUBLIC_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}

/**
 * Validate cross-domain session configuration
 * @returns Error message if invalid, null if valid
 */
export function validateCrossDomainSessionConfig(): string | null {
  const config = getCrossDomainSessionConfig()

  // Validate cookie domain format
  if (config.cookieDomain && !config.cookieDomain.startsWith('.')) {
    return 'Cookie domain must start with a dot (.) for subdomain sharing (e.g., ".snaplabs.global")'
  }

  // Validate sameSite value
  if (!['lax', 'strict', 'none'].includes(config.sameSite)) {
    return 'sameSite must be one of: lax, strict, none'
  }

  // Validate secure flag with sameSite
  if (config.sameSite === 'none' && !config.secure) {
    return 'sameSite="none" requires secure=true (HTTPS only)'
  }

  return null
}

/**
 * Get formatted cookie domain for display
 */
export function getFormattedCookieDomain(): string {
  const config = getCrossDomainSessionConfig()
  if (!config.cookieDomain) {
    return 'Single domain (no cross-subdomain sharing)'
  }
  return config.cookieDomain
}
