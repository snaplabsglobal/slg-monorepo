import { NextResponse } from 'next/server'
import {
  getCrossDomainSessionConfig,
  validateCrossDomainSessionConfig,
  getFormattedCookieDomain,
} from '@/config/cross-domain-session'

/**
 * GET /api/config/session
 * Returns current cross-domain session configuration (non-sensitive)
 * Useful for debugging and verifying configuration
 */
export async function GET() {
  const config = getCrossDomainSessionConfig()
  const validationError = validateCrossDomainSessionConfig()

  return NextResponse.json({
    configured: !!config.cookieDomain,
    cookieDomain: getFormattedCookieDomain(),
    cookieName: config.cookieName,
    sameSite: config.sameSite,
    secure: config.secure,
    environment: process.env.NODE_ENV,
    validationError,
    instructions: {
      setup: 'Set NEXT_PUBLIC_COOKIE_DOMAIN in your environment variables',
      format: "Use leading dot for subdomain sharing: '.snaplabs.global'",
      example: 'NEXT_PUBLIC_COOKIE_DOMAIN=.snaplabs.global',
    },
  })
}
