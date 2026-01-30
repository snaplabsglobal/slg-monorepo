// GET /api/ml/vendor-patterns?vendorName=... - Production ML: get learned + preset rules from DB
// See claude/PRODUCTION_ML_SYSTEM.md

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vendorName = searchParams.get('vendorName') ?? searchParams.get('vendor_name')
    if (!vendorName || typeof vendorName !== 'string') {
      return NextResponse.json(
        { error: 'vendorName query param is required' },
        { status: 400 }
      )
    }

    const normalized = vendorName.trim().toUpperCase()
    if (!normalized) {
      return NextResponse.json({
        correctionCount: 0,
        isDefaultRule: false,
        presetRule: null,
      })
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let correctionCount = 0
    let isDefaultRule = false
    let dateFormat: string | null = null
    let yearCentury: string | null = null

    let fieldPatterns: Array<{
      field_name: string
      pattern_value: unknown
      correction_count: number
      is_active: boolean
    }> = []

    if (membership?.organization_id) {
      const { data: row } = await supabase
        .from('vendor_date_patterns')
        .select('correction_count, is_default_rule, date_format, year_century')
        .eq('organization_id', membership.organization_id)
        .eq('vendor_name', normalized)
        .maybeSingle()

      if (row) {
        correctionCount = row.correction_count ?? 0
        isDefaultRule = Boolean(row.is_default_rule)
        dateFormat = row.date_format ?? null
        yearCentury = row.year_century ?? null
      }

      const { data: patterns, error: patternsError } = await supabase
        .from('vendor_patterns')
        .select('field_name, pattern_value, correction_count, is_active')
        .eq('organization_id', membership.organization_id)
        .eq('vendor_name', normalized)

      if (!patternsError && patterns?.length) {
        fieldPatterns = patterns.map((p: any) => ({
          field_name: p.field_name,
          pattern_value: p.pattern_value,
          correction_count: p.correction_count ?? 0,
          is_active: Boolean(p.is_active),
        }))
      }
    }

    const { data: preset } = await supabase
      .from('vendor_preset_rules')
      .select('date_format, year_century')
      .eq('vendor_name', normalized)
      .maybeSingle()

    return NextResponse.json({
      correctionCount,
      isDefaultRule,
      dateFormat,
      yearCentury,
      presetRule: preset
        ? { dateFormat: preset.date_format, yearCentury: preset.year_century ?? '20' }
        : null,
      fieldPatterns,
    })
  } catch (e: any) {
    console.error('[ML vendor-patterns]', e)
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
