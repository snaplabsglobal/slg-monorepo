/**
 * LedgerSnap ML correction helpers (production: DB-backed, no localStorage).
 * See claude/ML_CORRECTION_SYSTEM.md and claude/PRODUCTION_ML_SYSTEM.md
 */

const SUSPICIOUS_YEAR_THRESHOLD = 5

/** Returns true if date's year is more than 5 years from current year. */
export function isSuspiciousDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const year = new Date(dateStr).getFullYear()
  const currentYear = new Date().getFullYear()
  return Math.abs(currentYear - year) > SUSPICIOUS_YEAR_THRESHOLD
}

/** Years between date and current year (absolute). */
export function yearsFromNow(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  const year = new Date(dateStr).getFullYear()
  const currentYear = new Date().getFullYear()
  return Math.abs(currentYear - year)
}

/** Get correction count and rule for vendor from DB (production). */
export async function getVendorPattern(vendorName: string | null): Promise<{
  correctionCount: number
  isDefaultRule: boolean
  presetRule: { dateFormat: string; yearCentury: string } | null
}> {
  if (!vendorName || typeof vendorName !== 'string') {
    return { correctionCount: 0, isDefaultRule: false, presetRule: null }
  }
  try {
    const res = await fetch(
      `/api/ml/vendor-patterns?vendorName=${encodeURIComponent(vendorName.trim())}`
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { correctionCount: 0, isDefaultRule: false, presetRule: null }
    }
    return {
      correctionCount: json.correctionCount ?? 0,
      isDefaultRule: Boolean(json.isDefaultRule),
      presetRule: json.presetRule ?? null,
    }
  } catch {
    return { correctionCount: 0, isDefaultRule: false, presetRule: null }
  }
}

export interface RecordCorrectionResult {
  success: boolean
  correctionId?: string
  error?: string
  /** Set when correction_fields included 'transaction_date' (production ML). */
  vendorPattern?: {
    correctionCount: number
    isDefaultRule: boolean
  }
}

/** Record correction via API (writes to ml_training_data + vendor_patterns). */
export async function recordCorrection(params: {
  transactionId: string
  originalExtraction: Record<string, unknown>
  correctedData: Record<string, unknown>
  correctionFields: string[]
  correctionReason?: string | null
  /** Optional region/timezone for context (e.g. America/Vancouver). */
  locationContext?: string | null
}): Promise<RecordCorrectionResult> {
  try {
    const res = await fetch('/api/ml/correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: params.transactionId,
        originalExtraction: params.originalExtraction,
        correctedData: params.correctedData,
        correctionFields: params.correctionFields,
        correctionReason: params.correctionReason ?? null,
        locationRegion: params.locationContext ?? null,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: json?.error || `HTTP ${res.status}` }
    }
    return {
      success: true,
      correctionId: json.correctionId,
      vendorPattern: json.vendorPattern,
    }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error' }
  }
}
