// lib/categories/categories.ts
// Accounting categories utilities

import { createClient } from '@/app/lib/supabase/server'

export interface AccountingCategory {
  id: string
  code: string
  name_en: string
  name_fr?: string | null
  is_tax_deductible: boolean
  tax_deduction_rate: number
  cra_code?: string | null
  cra_description?: string | null
  gst_applicable: boolean
  pst_applicable: boolean
  industry_tags?: string[] | null
  is_system_category: boolean
  is_active: boolean
}

export interface TransactionCategory {
  id: string
  transaction_id: string
  category_id: string
  assignment_source: 'user_manual' | 'ai_auto' | 'rule_based' | 'imported'
  confidence_score?: number | null
  user_confirmed: boolean
  confirmed_at?: string | null
  is_tax_deductible?: boolean | null
  tax_deduction_amount_cents?: number | null
  notes?: string | null
  category?: AccountingCategory
}

/**
 * Get all accounting categories
 */
export async function getAccountingCategories() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounting_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name_en', { ascending: true })

  if (error) {
    console.error('Error fetching accounting categories:', error)
    return []
  }

  return data as AccountingCategory[]
}

/**
 * Get category for a transaction
 */
export async function getTransactionCategory(
  transactionId: string
): Promise<TransactionCategory | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_categories')
    .select(`
      *,
      category:accounting_categories(*)
    `)
    .eq('transaction_id', transactionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching transaction category:', error)
    return null
  }

  return data as TransactionCategory
}

/**
 * Auto-assign category to transaction (AI)
 */
export async function autoAssignCategory(
  transactionId: string,
  vendorName: string,
  amount: number
): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('auto_assign_category', {
    p_transaction_id: transactionId,
    p_vendor_name: vendorName,
    p_amount: amount,
  })

  if (error) {
    console.error('Error auto-assigning category:', error)
    return null
  }

  return data as string | null
}

/**
 * Confirm category for transaction
 */
export async function confirmCategory(
  transactionId: string,
  categoryId: string
): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase.rpc('confirm_category', {
    p_transaction_id: transactionId,
    p_category_id: categoryId,
    p_user_id: user.id,
  })

  if (error) {
    console.error('Error confirming category:', error)
    throw error
  }

  return true
}

/**
 * Update transaction category
 */
export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string
): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if category exists
  const existing = await getTransactionCategory(transactionId)

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('transaction_categories')
      .update({
        category_id: categoryId,
        assignment_source: 'user_manual',
        user_confirmed: true,
        confirmed_at: new Date().toISOString(),
        created_by: user.id,
      })
      .eq('transaction_id', transactionId)

    if (error) {
      console.error('Error updating transaction category:', error)
      throw error
    }
  } else {
    // Create new
    const { error } = await supabase.from('transaction_categories').insert({
      transaction_id: transactionId,
      category_id: categoryId,
      assignment_source: 'user_manual',
      user_confirmed: true,
      confirmed_at: new Date().toISOString(),
      created_by: user.id,
    })

    if (error) {
      console.error('Error creating transaction category:', error)
      throw error
    }
  }
}
