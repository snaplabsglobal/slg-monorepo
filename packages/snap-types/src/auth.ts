/**
 * Authentication and Authorization Constants
 */

/**
 * Admin email address for system-level admin access
 */
export const ADMIN_EMAIL = 'admin@snaplabsglobal.com'

/**
 * Admin dashboard URL
 */
export const ADMIN_DASHBOARD_URL = '/admin/dashboard'

/**
 * Application origin types
 */
export type AppOrigin = 'LS' | 'JSS' | 'SLG'

/**
 * User role types
 */
export type UserRole = 'user' | 'admin'

/**
 * Check if email is admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

/**
 * Get redirect URL based on user email and app origin
 */
export function getRedirectUrl(
  email: string | null | undefined,
  appOrigin?: AppOrigin,
  defaultRedirect: string = '/dashboard'
): string {
  // Admin always goes to admin dashboard
  if (isAdminEmail(email)) {
    return ADMIN_DASHBOARD_URL
  }

  // Regular users based on app origin
  switch (appOrigin) {
    case 'LS':
      return 'https://dev.ledgersnap.app/dashboard'
    case 'JSS':
      return 'https://dev.jobsitesnap.app/dashboard'
    case 'SLG':
      return '/dashboard'
    default:
      return defaultRedirect
  }
}

/**
 * Get admin dashboard URL for external redirect
 */
export function getAdminDashboardUrl(domain: string = 'dev.snaplabs.global'): string {
  return `https://${domain}${ADMIN_DASHBOARD_URL}`
}
