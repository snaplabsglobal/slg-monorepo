// ========================================
// Receipt Analyzer → Database Adapter
// ========================================
// File: lib/adapters/receipt-to-transaction.ts
// Purpose: Convert Gemini analysis results to database format
// ========================================

import { ReceiptAnalysisResult, ConfidenceScores } from '@/lib/gemini/receipt-analyzer';

// ========================================
// Database Types
// ========================================

export interface TransactionRecord {
  // Relations
  organization_id: string;
  project_id?: string | null;
  user_id?: string | null;
  created_by?: string | null;
  
  // Basic Info
  transaction_date: string; // DATE format: YYYY-MM-DD
  direction: 'income' | 'expense';
  source_app: string;
  
  // Amounts (in dollars, NUMERIC(15,2))
  total_amount: number;
  tax_amount: number;  // GST only (for ITC recovery)
  tax_details: TaxDetails;
  
  currency: string;
  original_currency: string;
  
  // Classification
  category_user: string | null;
  category_tax: string | null;
  expense_type: 'business' | 'personal';
  is_tax_deductible: boolean;
  
  // Vendor
  vendor_name: string | null;
  
  // Image
  attachment_url: string;
  
  // AI Recognition
  entry_source: 'ocr' | 'manual' | 'bank';
  ai_confidence: number;  // Overall confidence (0.00-1.00)
  raw_data: RawDataJsonb;
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  needs_review: boolean;
  is_reimbursable: boolean;
  
  // Notes
  internal_notes?: string | null;
}

export interface TaxDetails {
  gst_cents: number;
  gst_amount: number;
  gst_rate: number;
  
  pst_cents: number;
  pst_amount: number;
  pst_rate: number;
  
  total_tax_cents: number;
  bc_province: boolean;
  tax_split_confidence: number;
}

export interface RawDataJsonb {
  gemini_version: string;
  extracted_at: string;
  
  // Amounts in cents (precise calculation)
  amounts_cents: {
    subtotal: number;
    gst: number;
    pst: number;
    total: number;
  };
  
  // Accounting metadata
  accounting: {
    gifi_code: string | null;
    vendor_alias: string | null;
    is_meals_50_deductible: boolean;
    is_shareholder_loan_potential: boolean;
  };
  
  // Detailed confidence scores
  confidence: ConfidenceScores;
  
  // Raw OCR text
  raw_text: string;
  
  // Complete Gemini response (for debugging/reprocessing)
  gemini_raw_response: ReceiptAnalysisResult;
}

export interface TransactionItemRecord {
  transaction_id: string;
  organization_id: string;
  
  description: string;
  quantity: number;
  unit_price: number;  // In dollars
}

// ========================================
// Conversion Functions
// ========================================

/**
 * Convert Gemini analysis result to Transaction database format
 */
export function geminiResultToTransaction(
  result: ReceiptAnalysisResult,
  organizationId: string,
  userId: string,
  imageUrl: string,
  projectId?: string | null
): Partial<TransactionRecord> {
  // Calculate total tax in cents
  const totalTaxCents = result.gst_cents + result.pst_cents;
  
  // Convert amounts from cents to dollars
  const totalAmount = result.total_cents / 100;
  const gstAmount = result.gst_cents / 100;
  const pstAmount = result.pst_cents / 100;
  
  // Determine if needs review
  const needsReview = result.needs_review || result.confidence.overall < 0.9;
  
  return {
    // Relations
    organization_id: organizationId,
    user_id: userId,
    created_by: userId,
    project_id: projectId,
    
    // Basic Info
    transaction_date: result.receipt_date || new Date().toISOString().split('T')[0],
    direction: 'expense',
    source_app: 'ledgersnap',
    
    // Amounts (converted to dollars)
    total_amount: totalAmount,
    tax_amount: gstAmount,  // GST only for ITC recovery
    tax_details: {
      gst_cents: result.gst_cents,
      gst_amount: gstAmount,
      gst_rate: 0.05,
      
      pst_cents: result.pst_cents,
      pst_amount: pstAmount,
      pst_rate: 0.07,
      
      total_tax_cents: totalTaxCents,
      bc_province: true,
      tax_split_confidence: result.confidence.tax_split,
    },
    
    currency: result.currency,
    original_currency: result.currency,
    
    // Classification
    category_user: result.category,
    category_tax: null,  // Will be set by Dual Track system
    expense_type: result.is_shareholder_loan_potential ? 'personal' : 'business',
    is_tax_deductible: !result.is_shareholder_loan_potential,
    
    // Vendor
    vendor_name: result.vendor_name,
    
    // Image
    attachment_url: imageUrl,
    
    // AI Recognition
    entry_source: 'ocr',
    ai_confidence: result.confidence.overall,
    raw_data: {
      gemini_version: '2.0-flash',
      extracted_at: new Date().toISOString(),
      
      amounts_cents: {
        subtotal: result.subtotal_cents,
        gst: result.gst_cents,
        pst: result.pst_cents,
        total: result.total_cents,
      },
      
      accounting: {
        gifi_code: result.gifi_code_suggested,
        vendor_alias: result.vendor_alias,
        is_meals_50_deductible: result.is_meals_50_deductible,
        is_shareholder_loan_potential: result.is_shareholder_loan_potential,
      },
      
      confidence: result.confidence,
      raw_text: result.raw_text,
      gemini_raw_response: result,
    },
    
    // Status
    status: 'pending',
    needs_review: needsReview,
    is_reimbursable: false,
  };
}

/**
 * Convert Gemini items to TransactionItems format
 */
export function geminiItemsToTransactionItems(
  items: Array<{ description: string; quantity: number; price_cents: number }>,
  transactionId: string,
  organizationId: string
): TransactionItemRecord[] {
  return items.map(item => ({
    transaction_id: transactionId,
    organization_id: organizationId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.price_cents / 100,  // Convert cents to dollars
  }));
}

/**
 * Extract display-friendly data from Transaction record
 */
export function transactionToDisplayData(transaction: TransactionRecord) {
  return {
    id: transaction.organization_id,
    vendor: transaction.vendor_name || 'Unknown Vendor',
    vendorAlias: transaction.raw_data?.accounting?.vendor_alias || null,
    date: transaction.transaction_date,
    
    // Amounts (converted back to cents for display consistency)
    totalCents: Math.round(transaction.total_amount * 100),
    gstCents: Math.round(transaction.tax_amount * 100),
    pstCents: transaction.tax_details?.pst_cents || 0,
    
    // Amounts in dollars
    totalAmount: transaction.total_amount,
    gstAmount: transaction.tax_amount,
    pstAmount: transaction.tax_details?.pst_amount || 0,
    
    currency: transaction.currency,
    category: transaction.category_user,
    
    // Accounting
    gifiCode: transaction.raw_data?.accounting?.gifi_code || null,
    isMeals50Deductible: transaction.raw_data?.accounting?.is_meals_50_deductible || false,
    isShareholderLoan: transaction.raw_data?.accounting?.is_shareholder_loan_potential || false,
    
    // Confidence
    confidence: transaction.raw_data?.confidence || {
      vendor_name: transaction.ai_confidence,
      date: transaction.ai_confidence,
      amounts: transaction.ai_confidence,
      tax_split: transaction.ai_confidence,
      overall: transaction.ai_confidence,
    },
    
    // Status
    needsReview: transaction.needs_review,
    status: transaction.status,
    
    // Image
    imageUrl: transaction.attachment_url,
  };
}

/**
 * Validate Transaction data before insert
 */
export function validateTransactionData(transaction: Partial<TransactionRecord>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Required fields
  if (!transaction.organization_id) {
    errors.push('organization_id is required');
  }
  
  if (!transaction.transaction_date) {
    errors.push('transaction_date is required');
  }
  
  if (transaction.total_amount === undefined || transaction.total_amount === null) {
    errors.push('total_amount is required');
  }
  
  if (!transaction.currency) {
    errors.push('currency is required');
  }
  
  // Validation rules
  if (transaction.total_amount !== undefined && transaction.total_amount < 0) {
    errors.push('total_amount must be non-negative');
  }
  
  if (transaction.tax_amount !== undefined && transaction.tax_amount < 0) {
    errors.push('tax_amount must be non-negative');
  }
  
  if (transaction.ai_confidence !== undefined) {
    if (transaction.ai_confidence < 0 || transaction.ai_confidence > 1) {
      errors.push('ai_confidence must be between 0 and 1');
    }
  }
  
  // Check tax consistency
  if (transaction.tax_details) {
    const taxDetails = transaction.tax_details;
    const calculatedTotal = taxDetails.gst_cents + taxDetails.pst_cents;
    
    if (Math.abs(calculatedTotal - taxDetails.total_tax_cents) > 2) {
      errors.push('Tax amounts do not match (gst_cents + pst_cents ≠ total_tax_cents)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========================================
// Helper Functions
// ========================================

/**
 * Get UI badge color based on confidence
 */
export function getConfidenceBadge(confidence: number): {
  label: string;
  color: 'green' | 'yellow' | 'red';
  icon: '🟢' | '🟡' | '🔴';
} {
  if (confidence >= 0.9) {
    return { label: 'Verified', color: 'green', icon: '🟢' };
  } else if (confidence >= 0.5) {
    return { label: 'Needs Review', color: 'yellow', icon: '🟡' };
  } else {
    return { label: 'Failed', color: 'red', icon: '🔴' };
  }
}

/**
 * Get GIFI code description
 */
export function getGifiDescription(code: string | null): string | null {
  if (!code) return null;
  
  const gifiMap: Record<string, string> = {
    '8320': 'Materials/Supplies',
    '9281': 'Fuel Costs',
    '9282': 'Vehicle Repairs',
    '8810': 'Office Supplies',
    '8523': 'Meals & Entertainment (50% deductible)',
    '8862': 'Professional Services',
    '9220': 'Utilities',
    '9225': 'Telephone & Internet',
    '8760': 'Other Expenses',
  };
  
  return gifiMap[code] || `GIFI Code ${code}`;
}

/**
 * Format amount for display
 */
export function formatAmount(cents: number, currency: string = 'CAD'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// ========================================
// Export all functions
// ========================================

export default {
  geminiResultToTransaction,
  geminiItemsToTransactionItems,
  transactionToDisplayData,
  validateTransactionData,
  getConfidenceBadge,
  getGifiDescription,
  formatAmount,
};
