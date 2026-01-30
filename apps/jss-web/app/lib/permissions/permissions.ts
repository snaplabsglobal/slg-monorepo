// lib/permissions/permissions.ts
// Permission checking utilities (Server-only: uses next/headers via createClient)

import { createClient } from '@/lib/supabase/server'
import {
  checkAppAccessWithClient,
  logAppAccessWithClient,
} from './permissions-edge'

/**
 * Check if user has access to a specific app
 */
export async function checkAppAccess(
  userId: string,
  appCode: string
): Promise<boolean> {
  const supabase = await createClient()
  return checkAppAccessWithClient(supabase, userId, appCode)
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
  return logAppAccessWithClient(supabase, params)
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
