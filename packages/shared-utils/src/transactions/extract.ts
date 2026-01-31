/**
 * Single source of truth for tax + confidence extraction from transaction-like objects.
 * Used by TransactionDataForm and offline-cache to avoid "one page one algorithm".
 *
 * Canonical fields (align with repo):
 * - Total: transactions.total_amount
 * - Tax: transactions.tax_details (gst_amount/gst_cents, pst_amount/pst_cents)
 * - Confidence: transactions.ai_confidence, else raw_data.confidence.overall
 * - Status: transactions.is_verified (true = 全系统绿)
 */

export type TransactionLike = {
  id?: string
  total_amount?: number | string | null
  tax_details?: Record<string, unknown> | null
  ai_confidence?: number | null
  raw_data?: Record<string, unknown> | null
}

function num(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, ''))
    return Number.isNaN(n) ? null : n
  }
  return null
}

function moneyFromTaxDetails(
  td: Record<string, unknown> | null | undefined,
  keyAmount: string,
  keyCents: string
): number | null {
  if (!td || typeof td !== 'object') return null
  const a = num(td[keyAmount])
  if (a != null) return a
  const c = num(td[keyCents])
  if (c != null) return +(c / 100).toFixed(2)
  return null
}

function clampConfidence(v: number | null): number | null {
  if (v == null) return null
  if (Number.isNaN(v)) return null
  return Math.max(0, Math.min(1, v))
}

function containsTaxHint(rd: Record<string, unknown> | null | undefined): boolean {
  const text = String(rd?.ocr_text ?? rd?.raw_text ?? rd?.text ?? '')
  return /(GST|PST|HST|PROV\s*TAX|BC\s*PROV\s*TAX)/i.test(text)
}

export interface TransactionTaxAndConfidence {
  total: number
  gst: number | null
  pst: number | null
  confidence: number | null
  needs_review: boolean
}

/**
 * Extract tax (gst/pst) and confidence from a transaction-like object.
 * - total: from total_amount
 * - gst/pst: from tax_details (gst_amount/gst_cents, pst_amount/pst_cents); null = unknown/failed, NOT 0
 * - confidence: ai_confidence or raw_data.confidence.overall, clamped 0..1
 * - Force lower confidence when total>0 but tax is all zero (triggers yellow "需要确认")
 */
export function getTransactionTaxAndConfidence(t: TransactionLike | null | undefined): TransactionTaxAndConfidence {
  if (!t) {
    return { total: 0, gst: null, pst: null, confidence: null, needs_review: true }
  }
  const td = (t.tax_details ?? {}) as Record<string, unknown>
  const total = num(t.total_amount) ?? 0

  const gst = moneyFromTaxDetails(td, 'gst_amount', 'gst_cents')
  const pst = moneyFromTaxDetails(td, 'pst_amount', 'pst_cents')

  const rawConf = (t.raw_data as Record<string, unknown> | null | undefined)?.confidence
  const overallVal =
    rawConf != null && typeof rawConf === 'object' && 'overall' in rawConf
      ? (rawConf as Record<string, unknown>).overall
      : undefined
  const base =
    clampConfidence(typeof t.ai_confidence === 'number' ? t.ai_confidence : null) ??
    clampConfidence(num(overallVal))

  let confidence = base ?? null

  const gstVal = gst ?? 0
  const pstVal = pst ?? 0
  const taxAllZero = gstVal === 0 && pstVal === 0

  if (total > 0 && taxAllZero) {
    const hinted = containsTaxHint(t.raw_data as Record<string, unknown> | null | undefined)
    const forced = hinted ? 0.2 : 0.35
    confidence = confidence == null ? forced : Math.min(confidence, forced)
  }

  const needs_review = (confidence ?? 0) < 0.6

  // UI stability: treat 0 as "unknown" so we never display $0.00 for missing tax (null = 未知，不写 0)
  const gstOut = gst != null && gst === 0 ? null : gst
  const pstOut = pst != null && pst === 0 ? null : pst

  return {
    total,
    gst: gstOut,
    pst: pstOut,
    confidence,
    needs_review,
  }
}
