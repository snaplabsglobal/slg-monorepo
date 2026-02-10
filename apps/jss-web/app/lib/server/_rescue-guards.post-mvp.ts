/**
 * Rescue Mode 护栏函数
 *
 * 每个 rescue route.ts 都要用这些 helper:
 * - requireSessionOrg(): 从 cookie/JWT 取 user_id/org_id
 * - withIdempotency(): 写入接口统一包一层
 * - assertBelongsToOrg(): 校验资源所属 org
 */

import { NextResponse } from 'next/server'
import { getOrganizationIdOrThrow } from '@/lib/auth/getOrganizationId'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// Types
// ============================================================

export type SessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  organization_id: string
  user_id: string
}

export type IdempotencyResult<T> =
  | { cached: true; response: T }
  | { cached: false; response: null }

// ============================================================
// A. requireSessionOrg()
// ============================================================

/**
 * 从 cookie/JWT 取 user_id/org_id
 * 任何 API 缺 org 直接抛错 (调用方返回 401)
 */
export async function requireSessionOrg(): Promise<SessionContext> {
  const r = await getOrganizationIdOrThrow()
  const { data: { user } } = await r.supabase.auth.getUser()

  if (!user?.id) {
    throw new Error('Unauthorized: No user')
  }

  return {
    supabase: r.supabase,
    organization_id: r.organization_id,
    user_id: user.id,
  }
}

/**
 * 便捷包装：返回 context 或 401 Response
 */
export async function getSessionOrUnauthorized(): Promise<
  | { ok: true; ctx: SessionContext }
  | { ok: false; response: NextResponse }
> {
  try {
    const ctx = await requireSessionOrg()
    return { ok: true, ctx }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }
}

// ============================================================
// B. withIdempotency()
// ============================================================

/**
 * 写入接口统一包一层:
 * 1. 查 idempotency_keys 是否已有记录
 * 2. 有：直接返回保存的 response_json（确保幂等）
 * 3. 没有：执行 handler
 * 4. 把 response_json 写入 idempotency_keys
 * 5. 返回响应
 */
export async function checkIdempotencyKey<T>(
  ctx: SessionContext,
  route: string,
  key: string | null
): Promise<IdempotencyResult<T>> {
  if (!key) {
    return { cached: false, response: null }
  }

  const { data: existing } = await ctx.supabase
    .from('idempotency_keys')
    .select('response_json')
    .eq('organization_id', ctx.organization_id)
    .eq('key', key)
    .eq('route', route)
    .single()

  if (existing) {
    return { cached: true, response: existing.response_json as T }
  }

  return { cached: false, response: null }
}

/**
 * 保存幂等键响应
 */
export async function saveIdempotencyKey(
  ctx: SessionContext,
  route: string,
  key: string | null,
  requestHash: string,
  response: unknown
): Promise<void> {
  if (!key) return

  await ctx.supabase.from('idempotency_keys').insert({
    organization_id: ctx.organization_id,
    key,
    route,
    request_hash: requestHash,
    response_json: response,
  })
}

/**
 * 完整幂等包装器
 */
export async function withIdempotency<T>(
  ctx: SessionContext,
  route: string,
  key: string | null,
  requestBody: unknown,
  handler: () => Promise<T>
): Promise<{ response: T; fromCache: boolean }> {
  // 1. 检查缓存
  const cached = await checkIdempotencyKey<T>(ctx, route, key)
  if (cached.cached) {
    return { response: cached.response!, fromCache: true }
  }

  // 2. 执行 handler
  const response = await handler()

  // 3. 保存幂等键
  await saveIdempotencyKey(ctx, route, key, JSON.stringify(requestBody), response)

  return { response, fromCache: false }
}

// ============================================================
// C. assertBelongsToOrg()
// ============================================================

/**
 * 校验 scan 属于 org
 */
export async function assertScanBelongsToOrg(
  ctx: SessionContext,
  scanId: string
): Promise<{ valid: true; scan: ScanRecord } | { valid: false; error: string; status: number }> {
  const { data: scan, error } = await ctx.supabase
    .from('rescue_scans')
    .select('*')
    .eq('id', scanId)
    .eq('organization_id', ctx.organization_id)
    .single()

  if (error || !scan) {
    return { valid: false, error: 'scan_not_found', status: 404 }
  }

  return { valid: true, scan: scan as ScanRecord }
}

/**
 * 校验 cluster 属于 org 和 scan
 */
export async function assertClusterBelongsToOrg(
  ctx: SessionContext,
  scanId: string,
  clusterId: string
): Promise<{ valid: true; cluster: ClusterRecord } | { valid: false; error: string; status: number }> {
  const { data: cluster, error } = await ctx.supabase
    .from('rescue_clusters')
    .select('*')
    .eq('id', clusterId)
    .eq('scan_id', scanId)
    .eq('organization_id', ctx.organization_id)
    .single()

  if (error || !cluster) {
    return { valid: false, error: 'cluster_not_found', status: 404 }
  }

  return { valid: true, cluster: cluster as ClusterRecord }
}

/**
 * 校验 job 属于 org
 */
export async function assertJobBelongsToOrg(
  ctx: SessionContext,
  jobId: string
): Promise<{ valid: true; job: JobRecord } | { valid: false; error: string; status: number }> {
  const { data: job, error } = await ctx.supabase
    .from('jobs')
    .select('id, name')
    .eq('id', jobId)
    .eq('organization_id', ctx.organization_id)
    .single()

  if (error || !job) {
    return { valid: false, error: 'job_not_found', status: 404 }
  }

  return { valid: true, job: job as JobRecord }
}

/**
 * 校验 photo_ids 都属于 unknown 集合
 */
export async function assertPhotosInUnknown(
  ctx: SessionContext,
  scanId: string,
  photoIds: string[]
): Promise<{ valid: true; validPhotoIds: string[] } | { valid: false; error: string; status: number }> {
  const { data: unknown } = await ctx.supabase
    .from('rescue_unknown')
    .select('photo_ids')
    .eq('scan_id', scanId)
    .eq('organization_id', ctx.organization_id)
    .single()

  if (!unknown) {
    return { valid: false, error: 'unknown_not_found', status: 404 }
  }

  const unknownSet = new Set(unknown.photo_ids || [])
  const validPhotoIds = photoIds.filter(id => unknownSet.has(id))

  if (validPhotoIds.length === 0) {
    return { valid: false, error: 'invalid_photo_ids', status: 400 }
  }

  return { valid: true, validPhotoIds }
}

// ============================================================
// Record Types
// ============================================================

export type ScanRecord = {
  id: string
  organization_id: string
  created_by: string
  scope_mode: string
  stats_json: Record<string, unknown>
  date_range_min: string | null
  date_range_max: string | null
  date_range_basis: string | null
  status: 'active' | 'applied' | 'expired'
  created_at: string
  updated_at: string
  applied_at: string | null
  expires_at: string | null
}

export type ClusterRecord = {
  id: string
  scan_id: string
  organization_id: string
  photo_ids: string[]
  photo_count: number
  centroid_lat: number | null
  centroid_lng: number | null
  centroid_accuracy_m: number | null
  geohash: string | null
  address_display: string | null
  address_source: string | null
  address_confidence: number | null
  time_min: string | null
  time_max: string | null
  status: 'unreviewed' | 'confirmed' | 'skipped'
  job_id: string | null
  created_at: string
  updated_at: string
}

export type JobRecord = {
  id: string
  name: string
}
