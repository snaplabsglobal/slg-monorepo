/**
 * GET /api/artifacts/[id]/download
 *
 * Artifact Download with Audit Trail
 *
 * Returns a short-lived presigned URL for downloading the artifact.
 * CRITICAL: Writes immutable download_issued event for evidence chain.
 *
 * This is the ONLY way to get download URLs. Direct R2 access is blocked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ulid } from '@slo/shared-utils'
import type { ULID } from '@slo/snap-types'

// Short TTL for download URLs (5 minutes)
const DOWNLOAD_URL_TTL = 300

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

function getR2Config() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.R2_ENDPOINT?.match(/https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)?.[1]
  const accessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
  const bucketName =
    process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 credentials not configured')
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artifactId } = await params

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // Get organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    // Fetch artifact
    const { data: artifact, error: fetchError } = await supabase
      .from('core_artifact')
      .select('id, organization_id, storage_key, mime_type, kind, property_id, metadata')
      .eq('id', artifactId)
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    // Generate presigned download URL
    const config = getR2Config()
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })

    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: artifact.storage_key,
      ResponseContentType: artifact.mime_type,
    })

    const downloadUrl = await getSignedUrl(client, command, {
      expiresIn: DOWNLOAD_URL_TTL,
    })

    const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL * 1000).toISOString()

    // Get request context for audit
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      'unknown'

    // CRITICAL: Write immutable download audit event
    const eventId = ulid()
    const { error: eventError } = await supabase.from('core_event').insert({
      id: eventId,
      organization_id: membership.organization_id,
      actor_user_id: user.id,
      source_app: 'jss',
      type: 'core.artifact.download_issued',
      immutable: true, // Evidence chain - cannot be deleted!
      occurred_at: new Date().toISOString(),
      property_id: artifact.property_id || (artifact.metadata as Record<string, unknown>)?.property_id,
      entity_refs: [{ entity: 'artifact', id: artifactId }],
      payload: {
        schema_version: 1,
        artifact_id: artifactId,
        storage_key: artifact.storage_key,
        mime_type: artifact.mime_type,
        kind: artifact.kind,
        download_url_ttl_seconds: DOWNLOAD_URL_TTL,
        expires_at: expiresAt,
        // Audit context
        user_agent: userAgent.slice(0, 500), // Truncate for storage
        ip_address: ipAddress,
        request_timestamp: new Date().toISOString(),
      },
    })

    if (eventError) {
      // Log but don't fail - download should still work
      console.error('[Download Audit] Failed to write event:', eventError)
    }

    return NextResponse.json(
      {
        download_url: downloadUrl,
        expires_at: expiresAt,
        artifact_id: artifactId,
        mime_type: artifact.mime_type,
        audit_event_id: eventId,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[Artifact Download Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
