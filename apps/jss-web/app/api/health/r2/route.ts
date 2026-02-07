import { NextResponse } from 'next/server'
import { getSnapEvidenceBucketInfo } from '@/lib/snap-evidence/r2-storage'

/**
 * GET /api/health/r2 - Check SnapEvidence R2 configuration
 * Returns configuration status without exposing secrets
 */
export async function GET() {
  const checks = {
    CLOUDFLARE_ACCOUNT_ID: !!process.env.CLOUDFLARE_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!(process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID_SNAP_EVIDENCE),
    R2_SECRET_ACCESS_KEY: !!(process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY_SNAP_EVIDENCE),
    R2_BUCKET_SNAP_EVIDENCE: !!process.env.R2_BUCKET_SNAP_EVIDENCE,
    R2_PUBLIC_URL_SNAP_EVIDENCE: !!process.env.R2_PUBLIC_URL_SNAP_EVIDENCE,
  }

  const allConfigured = Object.values(checks).every(Boolean)

  let bucketInfo = { bucket: 'NOT_CHECKED', publicUrl: '', isValid: false }
  if (allConfigured) {
    try {
      bucketInfo = getSnapEvidenceBucketInfo()
    } catch (e) {
      bucketInfo = { bucket: 'ERROR', publicUrl: '', isValid: false }
    }
  }

  const response = {
    status: allConfigured && bucketInfo.isValid ? 'ok' : 'misconfigured',
    checks,
    bucket: bucketInfo.bucket,
    publicUrl: bucketInfo.publicUrl ? bucketInfo.publicUrl.replace(/https?:\/\//, '***://') : '',
    isValidBucket: bucketInfo.isValid,
    expectedBuckets: ['dev-slg-media', 'slg-media'],
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    status: allConfigured && bucketInfo.isValid ? 200 : 503,
  })
}
