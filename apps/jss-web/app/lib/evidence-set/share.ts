/**
 * Evidence Set Sharing
 *
 * Secure, read-only sharing for external parties.
 *
 * Key Principles:
 * - Inspectors never need to upload, edit, or manage files
 * - They receive a secure, read-only link
 * - Nothing more. Nothing less.
 */

import { createClient } from '@/lib/supabase/server'
import type { ShareLink, CreateShareLinkRequest } from '@/lib/types'

/**
 * Create a share link for an evidence set
 *
 * This marks the evidence set as 'shared' (locked for compliance)
 */
export async function createShareLink(
  request: CreateShareLinkRequest
): Promise<ShareLink> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get evidence set
  const { data: set, error: setError } = await supabase
    .from('evidence_sets')
    .select('organization_id, status')
    .eq('id', request.evidence_set_id)
    .single()

  if (setError || !set) throw new Error('Evidence set not found')

  // Update evidence set to 'shared' status if not already
  if (set.status !== 'shared') {
    await supabase
      .from('evidence_sets')
      .update({
        status: 'shared',
        shared_at: new Date().toISOString(),
      })
      .eq('id', request.evidence_set_id)
  }

  // Calculate expiration
  const expiresAt = request.expires_in_days
    ? new Date(Date.now() + request.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  // Create share link
  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .insert({
      organization_id: set.organization_id,
      evidence_set_id: request.evidence_set_id,
      view_type: request.view_type || 'evidence_readonly',
      expires_at: expiresAt,
      max_views: request.max_views || null,
      recipient_name: request.recipient_name || null,
      recipient_email: request.recipient_email || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (linkError) throw linkError

  // Log audit event
  await supabase.rpc('log_audit', {
    p_org_id: set.organization_id,
    p_entity_type: 'share_link',
    p_entity_id: link.id,
    p_action: 'share',
    p_metadata: {
      evidence_set_id: request.evidence_set_id,
      view_type: link.view_type,
      recipient_name: request.recipient_name,
      recipient_email: request.recipient_email,
    },
  })

  return link as ShareLink
}

/**
 * Get all share links for an evidence set
 */
export async function getShareLinksForSet(
  evidenceSetId: string
): Promise<ShareLink[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('evidence_set_id', evidenceSetId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ShareLink[]
}

/**
 * Revoke a share link (Digital Offboarding)
 *
 * This immediately invalidates the link.
 */
export async function revokeShareLink(shareLinkId: string): Promise<void> {
  const supabase = await createClient()

  const { data: link, error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareLinkId)
    .select('organization_id, evidence_set_id')
    .single()

  if (error) throw error

  // Log audit event
  await supabase.rpc('log_audit', {
    p_org_id: link.organization_id,
    p_entity_type: 'share_link',
    p_entity_id: shareLinkId,
    p_action: 'revoke',
    p_metadata: { evidence_set_id: link.evidence_set_id },
  })
}

/**
 * Generate the public URL for a share link
 */
export function getShareUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobsite-snap.snapglobal.tech'
  return `${baseUrl}/evidence/${token}`
}

/**
 * Log external view of share link (for audit)
 */
export async function logShareLinkView(
  shareLinkId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()

  const { data: link } = await supabase
    .from('share_links')
    .select('organization_id, evidence_set_id')
    .eq('id', shareLinkId)
    .single()

  if (!link) return

  await supabase.rpc('log_audit', {
    p_org_id: link.organization_id,
    p_entity_type: 'evidence_set',
    p_entity_id: link.evidence_set_id,
    p_action: 'view',
    p_metadata: {
      share_link_id: shareLinkId,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  })
}
