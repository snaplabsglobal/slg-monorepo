/**
 * JSS Runtime Fingerprint Endpoint
 * SEOS Governance: Runtime divergence detection + CTO diagnostics
 *
 * Returns runtime fingerprint for local/dev convergence verification.
 * Also provides storage/auth diagnostics for troubleshooting.
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Build-time constants (injected by Next.js)
const BUILD_ID = process.env.NEXT_BUILD_ID || 'unknown'
const GIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA || 'local'
const VERCEL_ENV = process.env.VERCEL_ENV || 'local'
const VERCEL_GIT_COMMIT_REF = process.env.VERCEL_GIT_COMMIT_REF || 'local'

/**
 * Hash all NEXT_PUBLIC_* env vars for fingerprint comparison
 */
function getPublicEnvFingerprint(): string {
  const publicEnvs = Object.entries(process.env)
    .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value || ''}`)
    .join('\n')

  return crypto.createHash('sha256').update(publicEnvs).digest('hex').slice(0, 16)
}

/**
 * Hash feature flags for fingerprint
 */
function getFeatureFlagsFingerprint(): string {
  const flags = {
    // photo_delete: API exists and is always enabled - flag reflects reality
    ENABLE_PHOTO_DELETE: process.env.NEXT_PUBLIC_ENABLE_PHOTO_DELETE || 'true',
    ENABLE_IMPORT: process.env.NEXT_PUBLIC_ENABLE_IMPORT || 'true',
    ENABLE_SMART_TRACE: process.env.NEXT_PUBLIC_ENABLE_SMART_TRACE || 'true',
  }

  const flagStr = Object.entries(flags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  return crypto.createHash('sha256').update(flagStr).digest('hex').slice(0, 16)
}

/**
 * Get storage diagnostics - explicit status, no guessing
 */
function getStorageDiagnostics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const snapEvidenceBucket = process.env.R2_BUCKET_SNAP_EVIDENCE || ''
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || ''
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID || ''
  const r2PublicUrl = process.env.R2_PUBLIC_URL_SNAP_EVIDENCE || ''
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Storage provider determination - explicit, no fallback
  let uploadProvider: 'r2' | 'mock' | 'not_configured'
  let uploadReady: boolean
  const missingEnvVars: string[] = []

  // Check SnapEvidence R2 configuration
  if (!snapEvidenceBucket) missingEnvVars.push('R2_BUCKET_SNAP_EVIDENCE')
  if (!cloudflareAccountId) missingEnvVars.push('CLOUDFLARE_ACCOUNT_ID')
  if (!r2AccessKey) missingEnvVars.push('R2_ACCESS_KEY_ID')
  if (!r2PublicUrl) missingEnvVars.push('R2_PUBLIC_URL_SNAP_EVIDENCE')

  if (missingEnvVars.length === 0) {
    uploadProvider = 'r2'
    uploadReady = true
  } else if (isDevelopment) {
    // In development, mock storage is available as fallback
    uploadProvider = 'mock'
    uploadReady = true
  } else {
    uploadProvider = 'not_configured'
    uploadReady = false
  }

  return {
    supabase: {
      url: supabaseUrl,
      isLocal: supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost'),
      isConfigured: !!supabaseUrl,
    },
    r2: {
      bucket: snapEvidenceBucket || 'NOT_SET',
      publicUrl: r2PublicUrl || 'NOT_SET',
      isConfigured: missingEnvVars.length === 0,
      missingEnvVars,
    },
    upload: {
      provider: uploadProvider,
      ready: uploadReady,
      error: uploadReady ? null : `Missing env vars: ${missingEnvVars.join(', ')}`,
    },
  }
}

/**
 * Get auth diagnostics
 */
function getAuthDiagnostics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  return {
    supabaseConfigured: !!(supabaseUrl && supabaseAnonKey),
    redirectUrl: siteUrl || 'NOT_SET',
    supabaseProject: supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
                     (supabaseUrl.includes('127.0.0.1') ? 'localhost' : 'unknown'),
  }
}

export async function GET() {
  const storage = getStorageDiagnostics()
  const auth = getAuthDiagnostics()

  const runtime = {
    // Identity
    app: 'jss-web',
    git_sha: GIT_SHA.slice(0, 8),
    git_branch: VERCEL_GIT_COMMIT_REF,
    build_id: BUILD_ID.slice(0, 16),

    // Environment
    env: process.env.NODE_ENV,
    vercel_env: VERCEL_ENV,

    // Fingerprints
    public_env_fingerprint: getPublicEnvFingerprint(),
    feature_flags_fingerprint: getFeatureFlagsFingerprint(),

    // Feature flags
    feature_flags: {
      photo_delete: process.env.NEXT_PUBLIC_ENABLE_PHOTO_DELETE !== 'false',
      import: process.env.NEXT_PUBLIC_ENABLE_IMPORT !== 'false',
      smart_trace: process.env.NEXT_PUBLIC_ENABLE_SMART_TRACE !== 'false',
    },

    // Storage diagnostics (CTO requirement)
    storage,

    // Auth diagnostics (CTO requirement)
    auth,

    // Service Worker
    sw: {
      expected_version: 'jss-sw-v2',
    },

    // Timestamp
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(runtime)
}
