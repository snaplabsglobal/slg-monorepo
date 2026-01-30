// lib/split/split.ts
// Receipt split utilities

import { createClient } from '@/app/lib/supabase/server'

export interface SplitItem {
  tagId: string
  amountCents: number
  description?: string
}

export interface SplitValidation {
  isValid: boolean
  originalAmount: number
  splitTotal: number
  differenceCents: number
  differenceDisplay: string
}

export interface TransactionSplit {
  id: string
  original_transaction_id: string
  split_status: 'active' | 'cancelled' | 'superseded'
  total_split_amount_cents: number
  validation_passed: boolean
  items: Array<{
    id: string
    amount_cents: number
    tag_id: string | null
    description: string | null
    tag?: {
      id: string
      name: string
      display_name: string | null
      color: string
    }
  }>
}

/**
 * Validate split amounts against original transaction
 */
export async function validateSplitAmounts(
  transactionId: string,
  splitAmounts: number[]
): Promise<SplitValidation> {
  const supabase = await createClient()

  const splitAmountsJson = JSON.stringify(
    splitAmounts.map((amount) => ({ amount_cents: amount }))
  )

  const { data, error } = await supabase.rpc('validate_split_amounts', {
    p_transaction_id: transactionId,
    p_split_amounts: splitAmountsJson,
  })

  if (error) {
    console.error('Error validating split amounts:', error)
    throw error
  }

  return data[0] as SplitValidation
}

/**
 * Create a transaction split
 */
export async function createTransactionSplit(
  transactionId: string,
  splitItems: SplitItem[]
): Promise<string> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const splitItemsJson = JSON.stringify(
    splitItems.map((item) => ({
      tag_id: item.tagId,
      amount_cents: item.amountCents,
      description: item.description || null,
    }))
  )

  const { data, error } = await supabase.rpc('create_transaction_split', {
    p_transaction_id: transactionId,
    p_split_items: splitItemsJson,
    p_user_id: user.id,
  })

  if (error) {
    console.error('Error creating transaction split:', error)
    throw error
  }

  return data as string
}

/**
 * Get transaction split details
 */
export async function getTransactionSplit(
  transactionId: string
): Promise<TransactionSplit | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_transaction_split', {
    p_transaction_id: transactionId,
  })

  if (error) {
    console.error('Error fetching transaction split:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  // Get split record
  const { data: splitRecord } = await supabase
    .from('transaction_splits')
    .select('*')
    .eq('original_transaction_id', transactionId)
    .eq('split_status', 'active')
    .single()

  if (!splitRecord) {
    return null
  }

  // Group items by split_id
  const items = data.map((row: any) => ({
    id: row.split_id,
    amount_cents: row.item_amount_cents,
    tag_id: null, // Will be filled from tags
    description: row.item_description,
    tag: null, // Will be filled if tag_name exists
  }))

  return {
    id: splitRecord.id,
    original_transaction_id: splitRecord.original_transaction_id,
    split_status: splitRecord.split_status,
    total_split_amount_cents: splitRecord.total_split_amount_cents,
    validation_passed: splitRecord.validation_passed,
    items,
  } as TransactionSplit
}

/**
 * Cancel a transaction split
 */
export async function cancelTransactionSplit(splitId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('cancel_transaction_split', {
    p_split_id: splitId,
  })

  if (error) {
    console.error('Error cancelling transaction split:', error)
    throw error
  }

  return data as boolean
}
