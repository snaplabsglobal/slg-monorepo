// lib/permissions/permissions-edge.ts
// Edge-safe RPC helpers: take Supabase client, no next/headers.
// Use from middleware with createMiddlewareClient() supabase.

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Check if user has access to a specific app (Edge-safe).
 */
export async function checkAppAccessWithClient(
  supabase: SupabaseClient,
  userId: string,
  appCode: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_app_access', {
    p_user_id: userId,
    p_app_code: appCode,
  })
  if (error) {
    console.error('Error checking app access:', error)
    return false
  }
  return data as boolean
}

/**
 * Log app access attempt (Edge-safe).
 */
export async function logAppAccessWithClient(
  supabase: SupabaseClient,
  params: {
    userId: string
    appCode: string
    accessGranted: boolean
    denialReason?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }
) {
  const { data, error } = await supabase.rpc('log_app_access', {
    p_user_id: params.userId,
    p_app_code: params.appCode,
    p_access_granted: params.accessGranted,
    p_denial_reason: params.denialReason,
    p_ip_address: params.ipAddress,
    p_user_agent: params.userAgent,
  })
  if (error) console.error('Error logging app access:', error)
  return data
}

/**
 * Get user data snapshot (Edge-safe). Use middleware supabase.
 */
export async function getUserDataSnapshotWithClient(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    const { data, error } = await supabase.rpc('get_user_stats', {
      p_user_id: userId,
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to get user data snapshot:', error)
    return null
  }
}
