// POST /api/ml/correction - Record user correction for LedgerSnap ML training
// See claude/ML_CORRECTION_SYSTEM.md and docs/ML_TRAINING_GUIDE.md

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const transactionId = body.transactionId ?? body.transaction_id
    const originalExtraction = body.originalExtraction ?? body.original_extraction
    const correctedData = body.correctedData ?? body.corrected_data
    const correctionFields = body.correctionFields ?? body.correction_fields
    const correctionReason = body.correctionReason ?? body.correction_reason ?? null
    const locationRegion =
      body.locationRegion ??
      body.location_region ??
      (body.locationContext != null ? body.locationContext?.region ?? body.locationContext : null) ??
      null

    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json(
        { error: 'transactionId is required' },
        { status: 400 }
      )
    }
    if (!originalExtraction || typeof originalExtraction !== 'object') {
      return NextResponse.json(
        { error: 'originalExtraction (object) is required' },
        { status: 400 }
      )
    }
    if (!correctedData || typeof correctedData !== 'object') {
      return NextResponse.json(
        { error: 'correctedData (object) is required' },
        { status: 400 }
      )
    }
    if (!Array.isArray(correctionFields) || correctionFields.length === 0) {
      return NextResponse.json(
        { error: 'correctionFields (non-empty array) is required' },
        { status: 400 }
      )
    }

    const { data: correctionId, error } = await supabase.rpc('record_ml_correction', {
      p_transaction_id: transactionId,
      p_original_extraction: originalExtraction,
      p_corrected_data: correctedData,
      p_correction_fields: correctionFields,
      p_correction_reason: correctionReason,
      p_location_region: typeof locationRegion === 'string' ? locationRegion : null,
    })

    if (error) {
      console.error('[ML correction] RPC error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to record correction' },
        { status: 500 }
      )
    }

    let vendorPattern: { correctionCount: number; isDefaultRule: boolean } | undefined
    if (correctionFields.includes('transaction_date')) {
      const { data: tx } = await supabase
        .from('transactions')
        .select('organization_id, vendor_name')
        .eq('id', transactionId)
        .single()
      const vendorName = tx?.vendor_name ? String(tx.vendor_name).trim().toUpperCase() : ''
      if (vendorName && tx?.organization_id) {
        const { data: row } = await supabase
          .from('vendor_date_patterns')
          .select('correction_count, is_default_rule')
          .eq('organization_id', tx.organization_id)
          .eq('vendor_name', vendorName)
          .maybeSingle()
        if (row) {
          vendorPattern = {
            correctionCount: row.correction_count ?? 0,
            isDefaultRule: Boolean(row.is_default_rule),
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      correctionId,
      vendorPattern,
    })
  } catch (e: any) {
    console.error('[ML correction]', e)
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
