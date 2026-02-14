/**
 * Environment Configuration Validator
 * CTO Requirement D: 禁止静默 fallback
 *
 * This module validates environment configuration at startup.
 * Missing required env vars will throw explicit errors, not silently fail.
 */

export interface EnvCheckResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  config: {
    supabase: { url: string; hasKey: boolean }
    storage: { bucket: string; hasCredentials: boolean }
    app: { env: string; nodeEnv: string }
  }
}

/**
 * Required environment variables for JSS to function
 */
const REQUIRED_ENV = {
  // Supabase (required for auth and data)
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',

  // App identity
  NEXT_PUBLIC_APP_CODE: 'Application code for permissions',
}

/**
 * Required for photo uploads (only if not in mock mode)
 */
const STORAGE_REQUIRED_ENV = {
  CLOUDFLARE_ACCOUNT_ID: 'Cloudflare account ID for R2',
  R2_BUCKET_SNAP_EVIDENCE: 'R2 bucket name (dev-slg-media or slg-media)',
  R2_ACCESS_KEY_ID: 'R2 access key',
  R2_SECRET_ACCESS_KEY: 'R2 secret key',
  R2_PUBLIC_URL_SNAP_EVIDENCE: 'R2 public URL for images',
}

/**
 * Check environment configuration
 * Call this at app startup to validate config
 */
export function checkEnv(): EnvCheckResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required vars
  for (const [key, description] of Object.entries(REQUIRED_ENV)) {
    if (!process.env[key]) {
      errors.push(`Missing ${key}: ${description}`)
    }
  }

  // Check storage vars (warnings in dev, errors in prod)
  const isProduction = process.env.NODE_ENV === 'production'
  const missingStorage: string[] = []

  for (const [key, description] of Object.entries(STORAGE_REQUIRED_ENV)) {
    if (!process.env[key]) {
      missingStorage.push(`${key}: ${description}`)
    }
  }

  if (missingStorage.length > 0) {
    const message = `Storage not configured. Photo uploads will fail.\nMissing: ${missingStorage.join(', ')}`
    if (isProduction) {
      errors.push(message)
    } else {
      warnings.push(message)
    }
  }

  // Check for invalid bucket names
  const bucket = process.env.R2_BUCKET_SNAP_EVIDENCE
  if (bucket && !['dev-slg-media', 'slg-media'].includes(bucket)) {
    errors.push(`Invalid R2_BUCKET_SNAP_EVIDENCE: "${bucket}". Must be dev-slg-media or slg-media.`)
  }

  // Build config summary
  const config = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    storage: {
      bucket: process.env.R2_BUCKET_SNAP_EVIDENCE || 'NOT_SET',
      hasCredentials: !!(
        process.env.CLOUDFLARE_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY
      ),
    },
    app: {
      env: process.env.VERCEL_ENV || 'local',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  }
}

/**
 * Assert environment is valid
 * Throws if required vars are missing
 * Use in server-side code that requires valid config
 */
export function assertEnv(): void {
  const result = checkEnv()

  if (!result.valid) {
    const errorMsg = [
      '========================================',
      'JSS ENVIRONMENT CONFIGURATION ERROR',
      '========================================',
      '',
      ...result.errors.map(e => `ERROR: ${e}`),
      '',
      'Fix these issues before continuing.',
      '========================================',
    ].join('\n')

    throw new Error(errorMsg)
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('========================================')
    console.warn('JSS Environment Warnings:')
    result.warnings.forEach(w => console.warn(`WARNING: ${w}`))
    console.warn('========================================')
  }
}

/**
 * Get upload provider based on env config
 * Returns explicit provider, never guesses
 */
export function getUploadProvider(): 'r2' | 'not_configured' {
  const hasR2 = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_BUCKET_SNAP_EVIDENCE &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL_SNAP_EVIDENCE
  )

  if (hasR2) return 'r2'
  return 'not_configured'
}
