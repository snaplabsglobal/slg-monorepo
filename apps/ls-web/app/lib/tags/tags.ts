// lib/tags/tags.ts
// Tag management utilities

import { createClient } from '@/app/lib/supabase/server'

export interface Tag {
  id: string
  name: string
  display_name: string | null
  color: string
  icon: string | null
  category: string | null
  usage_count: number
  last_used_at: string | null
}

export interface TransactionTag {
  id: string
  transaction_id: string
  tag_id: string
  source: 'user_manual' | 'ai_suggested' | 'ai_auto' | 'imported' | 'system'
  user_confirmed: boolean | null
  confidence_score: number | null
  tag?: Tag
}

/**
 * Get all tags for an organization
 */
export async function getTags(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .order('usage_count', { ascending: false })
    .order('last_used_at', { ascending: false })

  if (error) {
    console.error('Error fetching tags:', error)
    return []
  }

  return data as Tag[]
}

/**
 * Get popular tags (most used)
 */
export async function getPopularTags(organizationId: string, limit: number = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_popular_tags', {
    p_org_id: organizationId,
    p_limit: limit,
  })

  if (error) {
    console.error('Error fetching popular tags:', error)
    return []
  }

  return data
}

/**
 * Get AI suggested tags for a transaction
 */
export async function getAISuggestedTags(
  organizationId: string,
  vendorName: string,
  amount: number
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_ai_suggested_tags', {
    p_org_id: organizationId,
    p_vendor_name: vendorName,
    p_amount: amount,
  })

  if (error) {
    console.error('Error fetching AI suggested tags:', error)
    return []
  }

  return data
}

/**
 * Get tags for a specific transaction
 */
export async function getTransactionTags(transactionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_tags')
    .select(`
      *,
      tag:tags(*)
    `)
    .eq('transaction_id', transactionId)

  if (error) {
    console.error('Error fetching transaction tags:', error)
    return []
  }

  return data as TransactionTag[]
}

/**
 * Add tag to transaction
 */
export async function addTagToTransaction(
  transactionId: string,
  tagId: string,
  source: 'user_manual' | 'ai_suggested' | 'ai_auto' = 'user_manual',
  userConfirmed: boolean = true
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('add_tag_to_transaction', {
    p_transaction_id: transactionId,
    p_tag_id: tagId,
    p_source: source,
    p_user_confirmed: userConfirmed,
  })

  if (error) {
    console.error('Error adding tag to transaction:', error)
    throw error
  }

  return data
}

/**
 * Remove tag from transaction
 */
export async function removeTagFromTransaction(
  transactionId: string,
  tagId: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId)
    .eq('tag_id', tagId)

  if (error) {
    console.error('Error removing tag from transaction:', error)
    throw error
  }
}

/**
 * Create a new tag
 */
export async function createTag(
  organizationId: string,
  tagData: {
    name: string
    display_name?: string
    color?: string
    icon?: string
    category?: string
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tags')
    .insert({
      organization_id: organizationId,
      name: tagData.name,
      display_name: tagData.display_name || tagData.name,
      color: tagData.color || '#0066CC',
      icon: tagData.icon,
      category: tagData.category || 'custom',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tag:', error)
    throw error
  }

  return data as Tag
}

/**
 * Search transactions by tags
 */
export async function searchTransactionsByTags(
  organizationId: string,
  tagIds: string[],
  matchAll: boolean = false
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_transactions_by_tags', {
    p_org_id: organizationId,
    p_tag_ids: tagIds,
    p_match_all: matchAll,
  })

  if (error) {
    console.error('Error searching transactions by tags:', error)
    return []
  }

  return data
}
