/**
 * Evidence Set Mutations
 *
 * Write operations for evidence sets.
 * All mutations log to audit_logs for compliance.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  EvidenceSet,
  EvidenceSetPurpose,
  EvidenceSetStatus,
  CreateEvidenceSetRequest,
  UpdateEvidenceSetRequest,
  AddPhotosToSetRequest,
} from '@/lib/types'

/**
 * Create a new evidence set
 *
 * Phase 1: Called implicitly via "Pick & Share" flows
 * Phase 2: Explicit UI for creating evidence sets
 */
export async function createEvidenceSet(
  request: CreateEvidenceSetRequest
): Promise<EvidenceSet> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get job to get org_id
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('organization_id')
    .eq('id', request.job_id)
    .single()

  if (jobError || !job) throw new Error('Job not found')

  // Create evidence set
  const { data: set, error: setError } = await supabase
    .from('evidence_sets')
    .insert({
      organization_id: job.organization_id,
      job_id: request.job_id,
      name: request.name,
      purpose: request.purpose || 'custom',
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (setError) throw setError

  // Log audit event
  await supabase.rpc('log_audit', {
    p_org_id: job.organization_id,
    p_entity_type: 'evidence_set',
    p_entity_id: set.id,
    p_action: 'create',
    p_actor_role: 'owner',
    p_metadata: { name: request.name, purpose: request.purpose },
  })

  // Add initial photos if provided
  if (request.photo_ids && request.photo_ids.length > 0) {
    await addPhotosToSet(set.id, { photo_ids: request.photo_ids })
  }

  return set as EvidenceSet
}

/**
 * Update an evidence set
 *
 * Note: Cannot change status from 'shared' (locked for compliance)
 */
export async function updateEvidenceSet(
  evidenceSetId: string,
  request: UpdateEvidenceSetRequest
): Promise<EvidenceSet> {
  const supabase = await createClient()

  const { data: set, error } = await supabase
    .from('evidence_sets')
    .update({
      ...request,
      ...(request.status === 'shared' && { shared_at: new Date().toISOString() }),
    })
    .eq('id', evidenceSetId)
    .select()
    .single()

  if (error) throw error

  // Log audit event
  await supabase.rpc('log_audit', {
    p_org_id: set.organization_id,
    p_entity_type: 'evidence_set',
    p_entity_id: set.id,
    p_action: 'update',
    p_metadata: request,
  })

  return set as EvidenceSet
}

/**
 * Add photos to an evidence set
 *
 * This is the core "Pick" operation from "Pick & Share"
 */
export async function addPhotosToSet(
  evidenceSetId: string,
  request: AddPhotosToSetRequest
): Promise<void> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get evidence set for org_id
  const { data: set, error: setError } = await supabase
    .from('evidence_sets')
    .select('organization_id, status')
    .eq('id', evidenceSetId)
    .single()

  if (setError || !set) throw new Error('Evidence set not found')

  // Cannot add to shared sets
  if (set.status === 'shared') {
    throw new Error('Cannot modify shared evidence set')
  }

  // Get current max order_index
  const { data: maxOrder } = await supabase
    .from('evidence_set_items')
    .select('order_index')
    .eq('evidence_set_id', evidenceSetId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  let nextIndex = (maxOrder?.order_index ?? -1) + 1

  // Insert items
  const items = request.photo_ids.map((photoId, i) => ({
    evidence_set_id: evidenceSetId,
    photo_id: photoId,
    order_index: nextIndex + i,
    layer_label: request.layer_labels?.[photoId] || null,
    added_by: user.id,
  }))

  const { error: insertError } = await supabase
    .from('evidence_set_items')
    .upsert(items, { onConflict: 'evidence_set_id,photo_id' })

  if (insertError) throw insertError

  // Log audit event for each photo
  for (const photoId of request.photo_ids) {
    await supabase.rpc('log_audit', {
      p_org_id: set.organization_id,
      p_entity_type: 'evidence_set',
      p_entity_id: evidenceSetId,
      p_action: 'add',
      p_metadata: { photo_id: photoId },
    })
  }
}

/**
 * Remove photos from an evidence set
 */
export async function removePhotosFromSet(
  evidenceSetId: string,
  photoIds: string[]
): Promise<void> {
  const supabase = await createClient()

  // Get evidence set for org_id and status check
  const { data: set, error: setError } = await supabase
    .from('evidence_sets')
    .select('organization_id, status')
    .eq('id', evidenceSetId)
    .single()

  if (setError || !set) throw new Error('Evidence set not found')

  // Cannot remove from shared sets
  if (set.status === 'shared') {
    throw new Error('Cannot modify shared evidence set')
  }

  const { error: deleteError } = await supabase
    .from('evidence_set_items')
    .delete()
    .eq('evidence_set_id', evidenceSetId)
    .in('photo_id', photoIds)

  if (deleteError) throw deleteError

  // Log audit event for each photo
  for (const photoId of photoIds) {
    await supabase.rpc('log_audit', {
      p_org_id: set.organization_id,
      p_entity_type: 'evidence_set',
      p_entity_id: evidenceSetId,
      p_action: 'remove',
      p_metadata: { photo_id: photoId },
    })
  }
}

/**
 * Reorder photos within an evidence set
 */
export async function reorderPhotosInSet(
  evidenceSetId: string,
  photoIds: string[]
): Promise<void> {
  const supabase = await createClient()

  // Get evidence set for status check
  const { data: set, error: setError } = await supabase
    .from('evidence_sets')
    .select('status')
    .eq('id', evidenceSetId)
    .single()

  if (setError || !set) throw new Error('Evidence set not found')

  if (set.status === 'shared') {
    throw new Error('Cannot modify shared evidence set')
  }

  // Update order_index for each photo
  for (let i = 0; i < photoIds.length; i++) {
    await supabase
      .from('evidence_set_items')
      .update({ order_index: i })
      .eq('evidence_set_id', evidenceSetId)
      .eq('photo_id', photoIds[i])
  }
}

/**
 * Delete an evidence set (soft delete)
 */
export async function deleteEvidenceSet(evidenceSetId: string): Promise<void> {
  const supabase = await createClient()

  const { data: set, error } = await supabase
    .from('evidence_sets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', evidenceSetId)
    .select('organization_id')
    .single()

  if (error) throw error

  // Log audit event
  await supabase.rpc('log_audit', {
    p_org_id: set.organization_id,
    p_entity_type: 'evidence_set',
    p_entity_id: evidenceSetId,
    p_action: 'delete',
  })
}
