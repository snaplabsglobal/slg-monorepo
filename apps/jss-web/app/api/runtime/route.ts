/**
 * JSS Runtime Fingerprint Endpoint
 * SEOS Governance: Runtime divergence detection
 *
 * Returns runtime fingerprint for local/dev convergence verification.
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Build-time constants (injected by Next.js)
const BUILD_ID = process.env.NEXT_BUILD_ID || 'unknown'
const GIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA || 'local'

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
    ENABLE_PHOTO_DELETE: process.env.NEXT_PUBLIC_ENABLE_PHOTO_DELETE || 'false',
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
 * Get storage target hints (sanitized)
 */
function getStorageTargets() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const r2Bucket = process.env.R2_BUCKET_NAME || ''

  return {
    supabase_url_hint: supabaseUrl.includes('supabase.co')
      ? supabaseUrl.replace(/https:\/\/([^.]+)\.supabase\.co.*/, '$1.supabase.co')
      : supabaseUrl.includes('127.0.0.1') ? 'localhost' : 'unknown',
    r2_bucket_hint: r2Bucket.replace(/^(dev-|prod-)?(.{4}).*/, '$1$2***'),
  }
}

export async function GET() {
  const runtime = {
    app: 'jss-web',
    git_sha: GIT_SHA.slice(0, 8),
    build_id: BUILD_ID.slice(0, 16),
    public_env_fingerprint: getPublicEnvFingerprint(),
    feature_flags_fingerprint: getFeatureFlagsFingerprint(),
    feature_flags: {
      photo_delete: process.env.NEXT_PUBLIC_ENABLE_PHOTO_DELETE === 'true',
      import: process.env.NEXT_PUBLIC_ENABLE_IMPORT !== 'false',
      smart_trace: process.env.NEXT_PUBLIC_ENABLE_SMART_TRACE !== 'false',
    },
    sw: {
      // SW info must be collected client-side, provide expected version
      expected_version: 'jss-sw-v1',
    },
    storage_targets: getStorageTargets(),
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(runtime)
}
