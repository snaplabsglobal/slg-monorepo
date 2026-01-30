// GET /api/ml/stats - ML monitoring (ELEGANT_USER_DRIVEN_ML: SLG dashboard)
// Returns corrections count and learned patterns for the current org.

import { NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership?.organization_id) {
      return NextResponse.json({
        correctionsCount: 0,
        recentCorrections: [],
        datePatterns: [],
        fieldPatterns: [],
      })
    }

    const orgId = membership.organization_id

    const [countRes, correctionsRes, datePatternsRes, fieldPatternsRes] = await Promise.all([
      supabase
        .from('ml_training_data')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('ml_training_data')
        .select('id, transaction_id, correction_fields, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('vendor_date_patterns')
        .select('vendor_name, correction_count, is_default_rule, last_updated')
        .eq('organization_id', orgId)
        .order('correction_count', { ascending: false })
        .limit(20),
      supabase
        .from('vendor_patterns')
        .select('vendor_name, field_name, correction_count, is_active, last_updated')
        .eq('organization_id', orgId)
        .order('correction_count', { ascending: false })
        .limit(50),
    ])

    const correctionsCount = (countRes as { count?: number }).count ?? correctionsRes.data?.length ?? 0
    const recentCorrections = (correctionsRes.data ?? []).slice(0, 20).map((r: any) => ({
      id: r.id,
      transactionId: r.transaction_id,
      correctionFields: r.correction_fields ?? [],
      createdAt: r.created_at,
    }))

    const datePatterns = (datePatternsRes.data ?? []).map((r: any) => ({
      vendorName: r.vendor_name,
      correctionCount: r.correction_count ?? 0,
      isDefaultRule: Boolean(r.is_default_rule),
      lastUpdated: r.last_updated,
    }))

    const fieldPatterns = ((fieldPatternsRes as any).error ? [] : (fieldPatternsRes.data ?? [])).map((r: any) => ({
      vendorName: r.vendor_name,
      fieldName: r.field_name,
      correctionCount: r.correction_count ?? 0,
      isActive: Boolean(r.is_active),
      lastUpdated: r.last_updated,
    }))

    return NextResponse.json({
      correctionsCount,
      recentCorrections,
      datePatterns,
      fieldPatterns,
    })
  } catch (e: any) {
    console.error('[ML stats]', e)
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
