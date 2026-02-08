/**
 * Evidence Set Queries
 *
 * Read operations for evidence sets.
 * All queries respect RLS policies.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  EvidenceSet,
  EvidenceSetWithPhotos,
  EvidenceSetItem,
  JobPhoto,
} from '@/lib/types'

/**
 * Get all evidence sets for a job
 */
export async function getEvidenceSetsForJob(
  jobId: string
): Promise<EvidenceSet[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('evidence_sets')
    .select('*, photo_count:evidence_set_items(count)')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as EvidenceSet[]
}

/**
 * Get a single evidence set by ID
 */
export async function getEvidenceSet(
  evidenceSetId: string
): Promise<EvidenceSet | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('evidence_sets')
    .select('*')
    .eq('id', evidenceSetId)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as EvidenceSet
}

/**
 * Get evidence set with all photos (for display)
 */
export async function getEvidenceSetWithPhotos(
  evidenceSetId: string
): Promise<EvidenceSetWithPhotos | null> {
  const supabase = await createClient()

  // Get evidence set
  const { data: set, error: setError } = await supabase
    .from('evidence_sets')
    .select('*')
    .eq('id', evidenceSetId)
    .is('deleted_at', null)
    .single()

  if (setError) {
    if (setError.code === 'PGRST116') return null
    throw setError
  }

  // Get items with photos
  const { data: items, error: itemsError } = await supabase
    .from('evidence_set_items')
    .select(`
      *,
      photo:job_photos(*)
    `)
    .eq('evidence_set_id', evidenceSetId)
    .order('order_index', { ascending: true })

  if (itemsError) throw itemsError

  return {
    ...set,
    items: items as (EvidenceSetItem & { photo: JobPhoto })[],
  } as EvidenceSetWithPhotos
}

/**
 * Get all evidence sets containing a specific photo
 */
export async function getEvidenceSetsForPhoto(
  photoId: string
): Promise<EvidenceSet[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('evidence_set_items')
    .select('evidence_set:evidence_sets(*)')
    .eq('photo_id', photoId)

  if (error) throw error
  if (!data) return []

  // Extract evidence sets from the joined data
  const sets: EvidenceSet[] = []
  for (const item of data) {
    const set = item.evidence_set as unknown as EvidenceSet | null
    if (set && set.deleted_at === null) {
      sets.push(set)
    }
  }
  return sets
}

/**
 * Get evidence set by share link token (for public access)
 */
export async function getEvidenceSetByToken(
  token: string
): Promise<{
  evidenceSet: EvidenceSetWithPhotos
  shareLink: {
    view_type: string
    recipient_name: string | null
  }
} | null> {
  const supabase = await createClient()

  // Get share link
  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (linkError || !link) return null

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null
  }

  // Check view limit
  if (link.max_views && link.view_count >= link.max_views) {
    return null
  }

  // Get evidence set with photos
  const set = await getEvidenceSetWithPhotos(link.evidence_set_id)
  if (!set) return null

  // Increment view count
  await supabase
    .from('share_links')
    .update({
      view_count: link.view_count + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', link.id)

  return {
    evidenceSet: set,
    shareLink: {
      view_type: link.view_type,
      recipient_name: link.recipient_name,
    },
  }
}
