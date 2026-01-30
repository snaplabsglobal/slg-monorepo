// lib/permissions/permissions.ts
// Permission checking utilities

import { createClient } from '@/lib/supabase/server'

/**
 * Check if user has access to a specific app
 */
export async function checkAppAccess(
  userId: string,
  appCode: string
): Promise<boolean> {
  const supabase = await createClient()

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
 * Get user's accessible apps
 */
export async function getUserApps(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_user_apps', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error getting user apps:', error)
    return []
  }

  return data
}

/**
 * Log app access attempt
 */
export async function logAppAccess(params: {
  userId: string
  appCode: string
  accessGranted: boolean
  denialReason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('log_app_access', {
    p_user_id: params.userId,
    p_app_code: params.appCode,
    p_access_granted: params.accessGranted,
    p_denial_reason: params.denialReason,
    p_ip_address: params.ipAddress,
    p_user_agent: params.userAgent,
  })

  if (error) {
    console.error('Error logging app access:', error)
  }

  return data
}

/**
 * Create upgrade request
 */
export async function createUpgradeRequest(params: {
  userId: string
  toTier: string
  appCode: string
  referralSource?: string
  userDataSnapshot?: Record<string, any>
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_upgrade_request', {
    p_user_id: params.userId,
    p_to_tier: params.toTier,
    p_app_code: params.appCode,
    p_referral_source: params.referralSource,
    p_user_data_snapshot: params.userDataSnapshot || {},
  })

  if (error) {
    console.error('Error creating upgrade request:', error)
    throw error
  }

  return data
}

/**
 * Get user's subscription info
 */
export async function getUserSubscription(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, accessible_apps')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error getting user subscription:', error)
    return null
  }

  return data
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'admin'
}

/**
 * Grant app access to user (Admin only)
 */
export async function grantAppAccess(
  userId: string,
  appCode: string,
  adminId: string
) {
  const supabase = await createClient()

  // Verify admin privileges
  const adminCheck = await isAdmin(adminId)
  if (!adminCheck) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get current accessible apps
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('accessible_apps')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const currentApps = profile.accessible_apps || []
  const newApps = Array.from(new Set([...currentApps, appCode]))

  // Update accessible apps
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ accessible_apps: newApps })
    .eq('id', userId)

  if (updateError) throw updateError

  return true
}

/**
 * Revoke app access from user (Admin only)
 */
export async function revokeAppAccess(
  userId: string,
  appCode: string,
  adminId: string
) {
  const supabase = await createClient()

  // Verify admin privileges
  const adminCheck = await isAdmin(adminId)
  if (!adminCheck) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get current accessible apps
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('accessible_apps')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const currentApps = profile.accessible_apps || []
  const newApps = currentApps.filter((app) => app !== appCode)

  // Update accessible apps
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ accessible_apps: newApps })
    .eq('id', userId)

  if (updateError) throw updateError

  return true
}
