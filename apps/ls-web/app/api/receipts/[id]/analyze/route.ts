// app/api/receipts/[id]/analyze/route.ts
// Process Later: fetch uploaded image, run Gemini, update existing transaction

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { createClient } from '@supabase/supabase-js'
import { analyzeReceiptWithGemini } from '../../_gemini'

type RouteContext = { params: Promise<{ id: string }> }

/** Parse date string with DD/MM/YY or MM/DD/YY and year century; return YYYY-MM-DD or null. */
function parseDateWithFormat(
  dateStr: string | null | undefined,
  dateFormat: string,
  yearCentury: string
): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const s = dateStr.trim()
  if (!s) return null
  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const parts = s.split(/[/\-.]/)
  if (parts.length !== 3) return null
  const fmt = dateFormat.toUpperCase()
  let day: number, month: number, year: number
  if (fmt === 'DD/MM/YY' || fmt === 'DD/MM/YYYY') {
    day = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10)
    year = parseInt(parts[2], 10)
  } else if (fmt === 'MM/DD/YY' || fmt === 'MM/DD/YYYY') {
    month = parseInt(parts[0], 10)
    day = parseInt(parts[1], 10)
    year = parseInt(parts[2], 10)
  } else {
    return null
  }
  if (year < 100) year = parseInt(String(yearCentury || '20') + String(year).padStart(2, '0'), 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const y = String(year)
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function inferMimeType(url: string) {
  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.heic')) return 'image/heic'
  if (lower.endsWith('.heif')) return 'image/heif'
  return 'image/jpeg'
}

/** Normalize phone to digits for lookup (e.g. 604-464-5522 -> 6044645522). */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}

export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  const { id } = await context.params
  console.log('[Analyze Receipt] Request received at:', new Date().toISOString())

  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && request.headers.get('Authorization') === `Bearer ${cronSecret}`

  try {
    console.log('[Analyze Receipt] Processing transaction:', id)
    let supabase: any
    let organizationId: string

    if (isCron) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !serviceKey) {
        return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
      }
      supabase = createClient(url, serviceKey)
      const { data: pending } = await (supabase as any)
        .from('pending_analysis')
        .select('organization_id')
        .eq('transaction_id', id)
        .maybeSingle()
      organizationId = (pending as any)?.organization_id
      if (!organizationId) {
        const { data: tx } = await (supabase as any)
          .from('transactions')
          .select('organization_id')
          .eq('id', id)
          .maybeSingle()
        organizationId = (tx as any)?.organization_id
      }
      if (!organizationId) {
        return NextResponse.json({ error: 'Transaction or org not found' }, { status: 404 })
      }
    } else {
      supabase = await createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: membership } = await (supabase as any)
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!(membership as any)?.organization_id) {
        return NextResponse.json({ error: 'No organization' }, { status: 400 })
      }
      organizationId = (membership as any).organization_id
    }

    // Load current transaction
    const { data: current, error: currentError } = await (supabase as any)
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 })
    }
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Layer 1 + 3 protections (consistent with deletion system)
    if (current.deleted_at) {
      return NextResponse.json({ error: 'Deleted records cannot be analyzed. Restore first.' }, { status: 409 })
    }
    if (current.status === 'exported' || current.status === 'locked' || current.status === 'voided') {
      return NextResponse.json({ error: 'Locked records cannot be analyzed.' }, { status: 409 })
    }

    const attachmentUrl = current.attachment_url as string | null
    if (!attachmentUrl) {
      return NextResponse.json({ error: 'Missing attachment_url' }, { status: 400 })
    }

    // Fetch image bytes from URL (R2 public URL or Supabase public URL)
    console.log('[Analyze Receipt] Fetching image from:', attachmentUrl)
    const imgRes = await fetch(attachmentUrl)
    if (!imgRes.ok) {
      console.error('[Analyze Receipt] Failed to fetch image:', {
        url: attachmentUrl,
        status: imgRes.status,
        statusText: imgRes.statusText,
      })
      return NextResponse.json(
        { error: 'Failed to fetch image', status: imgRes.status, statusText: imgRes.statusText },
        { status: 502 }
      )
    }
    const mimeType =
      imgRes.headers.get('content-type')?.split(';')?.[0]?.trim() || inferMimeType(attachmentUrl)
    const fileBuffer = await imgRes.arrayBuffer()
    console.log('[Analyze Receipt] Image fetched, size:', fileBuffer.byteLength, 'bytes, mime:', mimeType)

    // Run Gemini
    console.log('[Analyze Receipt] Starting Gemini analysis...')
    let analysis
    try {
      analysis = await analyzeReceiptWithGemini(fileBuffer, mimeType)
      console.log('[Analyze Receipt] Gemini analysis completed:', {
        vendor: analysis.vendor_name,
        total_cents: analysis.total_cents,
        confidence: analysis.confidence.overall,
      })
    } catch (geminiError: any) {
      console.error('[Analyze Receipt] Gemini analysis failed:', geminiError)
      // Mark transaction as error status
      await (supabase as any)
        .from('transactions')
        .update({
          status: 'error',
          needs_review: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
      return NextResponse.json(
        { error: 'AI analysis failed', message: geminiError?.message || 'Gemini API error' },
        { status: 500 }
      )
    }

    // Sub_location + phone binding (COO: 分店名優先 + 電話綁定)
    const phoneNormalized = normalizePhone(analysis.store_phone)
    let subLocationFinal: string | null = null
    if (phoneNormalized && organizationId) {
      const { data: phoneBinding } = await (supabase as any)
        .from('vendor_branch_phones')
        .select('sub_location, vendor_name')
        .eq('organization_id', organizationId)
        .eq('phone_normalized', phoneNormalized)
        .maybeSingle()
      if (phoneBinding?.sub_location) {
        subLocationFinal = phoneBinding.sub_location
        console.log('[Analyze Receipt] Phone binding:', { phone: phoneNormalized, sub_location: subLocationFinal })
      }
    }
    if (subLocationFinal == null && analysis.sub_location?.trim()) {
      subLocationFinal = analysis.sub_location.trim()
    }
    const vendorNameBase = (analysis.vendor_name || '').trim()
    const vendorNameFinal =
      vendorNameBase && subLocationFinal
        ? `${vendorNameBase} ${subLocationFinal}`.trim()
        : vendorNameBase || null

    // User-driven ML: apply learned/preset date rules (ELEGANT_USER_DRIVEN_ML)
    let transactionDateForUpdate = analysis.transaction_date || current.transaction_date
    let needsReviewFromRule = false
    const normalizedVendor = (analysis.vendor_name || '').trim().toUpperCase()
    if (normalizedVendor && analysis.transaction_date) {
      const { data: preset } = await (supabase as any)
        .from('vendor_preset_rules')
        .select('date_format, year_century')
        .eq('vendor_name', normalizedVendor)
        .maybeSingle()
      if (preset?.date_format) {
        const normalized = parseDateWithFormat(
          analysis.transaction_date,
          preset.date_format,
          preset.year_century ?? '20'
        )
        if (normalized) {
          transactionDateForUpdate = normalized
          if (normalized !== (analysis.transaction_date || '').slice(0, 10)) {
            needsReviewFromRule = true
          }
        }
      }
      if (!preset && organizationId) {
        const { data: orgPattern } = await (supabase as any)
          .from('vendor_date_patterns')
          .select('is_default_rule, date_format, year_century')
          .eq('organization_id', organizationId)
          .eq('vendor_name', normalizedVendor)
          .maybeSingle()
        if (orgPattern?.is_default_rule && orgPattern?.date_format) {
          const normalized = parseDateWithFormat(
            analysis.transaction_date,
            orgPattern.date_format,
            orgPattern.year_century ?? '20'
          )
          if (normalized) {
            transactionDateForUpdate = normalized
            if (normalized !== (analysis.transaction_date || '').slice(0, 10)) {
              needsReviewFromRule = true
            }
          }
        }
      }
    }

    // Amount handling: store positive values, keep originals in raw_data
    const subtotalCents = Math.abs(analysis.subtotal_cents || 0)
    const gstCents = Math.abs(analysis.gst_cents || 0)
    const pstCents = Math.abs(analysis.pst_cents || 0)
    const totalCents = Math.abs(analysis.total_cents || 0)

    const expectedGST = Math.round(subtotalCents * 0.05)
    const expectedPST = Math.round(subtotalCents * 0.07)
    const gstDiff = Math.abs(gstCents - expectedGST)
    const pstDiff = Math.abs(pstCents - expectedPST)
    const taxMismatch = gstDiff > 50 || pstDiff > 50
    const isRefund = (analysis.total_cents || 0) < 0

    // Layer 3: Fuzzy Matching - Check for potential duplicates (amount + date + vendor)
    // Enhanced duplicate detection: Vendor + Amount + Date matching
    let isSuspectedDuplicate = false
    let duplicateDetails: any[] = []
    
    const vendorForDup = vendorNameFinal ?? analysis.vendor_name
    if (vendorForDup && totalCents > 0) {
      const transactionDate = analysis.transaction_date || current.transaction_date
      const totalAmount = totalCents / 100

      // Exact match: vendor + amount + date (vendor includes branch when present)
      const { data: exactMatches } = await (supabase as any)
        .from('transactions')
        .select('id, vendor_name, total_amount, transaction_date, status')
        .eq('organization_id', organizationId)
        .eq('vendor_name', vendorForDup)
        .eq('total_amount', totalAmount)
        .eq('transaction_date', transactionDate)
        .neq('id', id)
        .is('deleted_at', null)
        .limit(5)

      // Fuzzy match: amount + date (vendor name similarity check)
      const { data: fuzzyMatches } = await (supabase as any)
        .from('transactions')
        .select('id, vendor_name, total_amount, transaction_date, status')
        .eq('organization_id', organizationId)
        .eq('total_amount', totalAmount)
        .eq('transaction_date', transactionDate)
        .neq('id', id)
        .is('deleted_at', null)
        .limit(10)

      // Check vendor name similarity (simple string similarity)
      const vendorLower = (vendorForDup || '').toLowerCase()
      const similarVendors = (fuzzyMatches || []).filter((d: any) => {
        const dVendorLower = (d.vendor_name || '').toLowerCase()
        // Check if vendor names are similar (contain common words or are very similar)
        return (
          dVendorLower.includes(vendorLower) ||
          vendorLower.includes(dVendorLower) ||
          dVendorLower === vendorLower
        )
      })

      if (exactMatches && exactMatches.length > 0) {
        isSuspectedDuplicate = true
        duplicateDetails = exactMatches
        console.log('[Analyze Receipt] Exact duplicate detected:', {
          current_id: id,
          duplicates: exactMatches.map((d: any) => ({
            id: d.id,
            vendor: d.vendor_name,
            amount: d.total_amount,
            date: d.transaction_date,
          })),
        })
      } else if (similarVendors.length > 0) {
        isSuspectedDuplicate = true
        duplicateDetails = similarVendors
        console.log('[Analyze Receipt] Fuzzy duplicate detected (similar vendor):', {
          current_id: id,
          duplicates: similarVendors.map((d: any) => ({
            id: d.id,
            vendor: d.vendor_name,
            amount: d.total_amount,
            date: d.transaction_date,
          })),
        })
      }
    }

    // If suspected duplicate, set status to 'warning' (yellow card)
    // Otherwise, use normal review logic
    const needsReview =
      taxMismatch ||
      analysis.needs_review ||
      !analysis.vendor_name ||
      (analysis.confidence.overall || 0) < 0.9

    // Status priority: warning (duplicate) > pending (needs review) > approved
    const nextStatus = isSuspectedDuplicate 
      ? 'warning'  // Yellow card for suspected duplicates
      : needsReview 
        ? 'pending' 
        : 'approved'

    const rawData: any = {
      ...(current.raw_data || {}),
      amounts_cents: {
        subtotal: analysis.subtotal_cents,
        gst: analysis.gst_cents,
        pst: analysis.pst_cents,
        total: analysis.total_cents,
      },
      amounts_absolute: {
        subtotal: subtotalCents,
        gst: gstCents,
        pst: pstCents,
        total: totalCents,
      },
      is_refund: isRefund,
      accounting: {
        gifi_code: analysis.gifi_code_suggested,
        vendor_alias: analysis.vendor_alias,
        is_meals_50_deductible: analysis.is_meals_50_deductible,
        is_shareholder_loan_potential: analysis.is_shareholder_loan_potential,
      },
      confidence: analysis.confidence,
      raw_text: analysis.raw_text,
      analyzed_at: new Date().toISOString(),
      analyzer: 'gemini-2.5-flash',
    }
    
    // Store duplicate_details in raw_data (not a database column)
    if (isSuspectedDuplicate && duplicateDetails.length > 0) {
      rawData.duplicate_details = duplicateDetails
    }

    const updates: Record<string, any> = {
      vendor_name: vendorNameFinal ?? analysis.vendor_name,
      sub_location: subLocationFinal ?? undefined,
      transaction_date: analysis.transaction_date || current.transaction_date,
      currency: analysis.currency || current.currency || 'CAD',
      // Ensure total_amount is always positive (use Math.abs to be safe)
      total_amount: Math.abs(totalCents / 100),
      tax_amount: Math.abs(gstCents / 100),
      category_user: analysis.category || current.category_user || null,
      entry_source: 'ocr',
      ai_confidence: analysis.confidence.overall,
      needs_review: needsReview || isSuspectedDuplicate, // Mark for review if duplicate
      status: nextStatus, // 'warning' for duplicates, 'pending' for review, 'approved' otherwise
      tax_details: {
        gst_cents: gstCents,
        gst_amount: gstCents / 100,
        gst_rate: 0.05,
        pst_cents: pstCents,
        pst_amount: pstCents / 100,
        pst_rate: 0.07,
        total_tax_cents: gstCents + pstCents,
        bc_province: true,
        tax_split_confidence: analysis.confidence.tax_split,
        tax_mismatch: taxMismatch,
      },
      raw_data: rawData,
      updated_at: new Date().toISOString(),
    }
    
    // Conditionally add is_suspected_duplicate (only if column exists)
    // If column doesn't exist, we'll retry without it
    if (isSuspectedDuplicate) {
      updates.is_suspected_duplicate = true
    }

    let updatedTx: any = null
    let updateError: any = null
    
    // Try to update with is_suspected_duplicate first
    const { data: tx, error: err } = await (supabase as any)
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle()
    
    updatedTx = tx
    updateError = err
    
    // If error is due to missing is_suspected_duplicate column, retry without it
    if (updateError && updateError.message?.includes('is_suspected_duplicate') && updateError.message?.includes('schema cache')) {
      console.warn('[Analyze Receipt] is_suspected_duplicate column not found, retrying without it')
      const updatesWithoutDuplicate = { ...updates }
      delete updatesWithoutDuplicate.is_suspected_duplicate

      const { data: txRetry, error: errRetry } = await (supabase as any)
        .from('transactions')
        .update(updatesWithoutDuplicate)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select('*')
        .maybeSingle()

      updatedTx = txRetry
      updateError = errRetry
    }

    // If error is due to missing sub_location column, retry without it
    if (updateError && updateError.message?.includes('sub_location')) {
      console.warn('[Analyze Receipt] sub_location column not found, retrying without it')
      const updatesWithoutSubLocation = { ...updates }
      delete updatesWithoutSubLocation.sub_location

      const { data: txRetry, error: errRetry } = await (supabase as any)
        .from('transactions')
        .update(updatesWithoutSubLocation)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select('*')
        .maybeSingle()

      updatedTx = txRetry
      updateError = errRetry
    }

    if (updateError) {
      console.error('[Analyze Receipt] Update error:', updateError)
      return NextResponse.json({ error: updateError.message, details: updateError }, { status: 500 })
    }
    
    if (!updatedTx) {
      console.error('[Analyze Receipt] Update succeeded but no transaction returned')
      // Try to fetch the transaction directly to verify it was updated
      const { data: fetchedTx, error: fetchError } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()
      
      if (fetchError || !fetchedTx) {
        return NextResponse.json({ error: 'Update succeeded but transaction not found' }, { status: 500 })
      }
      
      updatedTx = fetchedTx
      console.warn('[Analyze Receipt] Using fetched transaction after update returned null')
    }
    
    console.log('[Analyze Receipt] Update successful:', {
      id: updatedTx.id,
      vendor_name: updatedTx.vendor_name,
      status: updatedTx.status,
      ai_confidence: updatedTx.ai_confidence,
      needs_review: updatedTx.needs_review,
    })
    
    // CRITICAL: Verify the update actually changed the vendor_name
    if (updatedTx.vendor_name === 'Processing...' || updatedTx.vendor_name === current.vendor_name) {
      console.error('[Analyze Receipt] WARNING: Update did not change vendor_name!', {
        before: current.vendor_name,
        after: updatedTx.vendor_name,
        analysis_vendor: analysis.vendor_name,
      })
      // This shouldn't happen, but if it does, we should still return success
      // The issue might be that the update didn't actually apply
    }

    // Replace transaction items (best-effort)
    try {
      await (supabase as any)
        .from('transaction_items')
        .delete()
        .eq('transaction_id', id)
        .eq('organization_id', organizationId)

      if (analysis.items && analysis.items.length > 0) {
        const items = analysis.items.map((item: any) => ({
          transaction_id: id,
          organization_id: organizationId,
          description: item.description,
          quantity: item.quantity,
          unit_price: Math.abs(item.price_cents || 0) / 100,
        }))

        await (supabase as any).from('transaction_items').insert(items)
      }
    } catch {
      // ignore items failures
    }

    // Learn phone -> branch binding for next time (COO: 電話綁定)
    if (
      phoneNormalized &&
      subLocationFinal &&
      vendorNameBase &&
      organizationId
    ) {
      try {
        await (supabase as any).from('vendor_branch_phones').upsert(
          {
            organization_id: organizationId,
            vendor_name: vendorNameBase,
            phone_normalized: phoneNormalized,
            sub_location: subLocationFinal,
          },
          {
            onConflict: 'organization_id,phone_normalized',
            ignoreDuplicates: false,
          }
        )
      } catch {
        // ignore (table may not exist yet)
      }
    }

    // Log to ML training data (best-effort)
    try {
      await (supabase as any).from('ml_training_data').insert({
        organization_id: organizationId,
        transaction_id: id,
        input_data: {
          image_url: attachmentUrl,
          raw_text: analysis.raw_text,
        },
        output_data: analysis,
        ai_model: 'gemini-2.5-flash',
        ai_confidence: analysis.confidence.overall,
        needs_review: analysis.needs_review,
      })
    } catch {
      // ignore
    }

    // Ensure we return the updated transaction with all fields
    const response = {
      success: true,
      transaction: {
        id: updatedTx.id,
        vendor_name: updatedTx.vendor_name,
        transaction_date: updatedTx.transaction_date,
        total_amount: updatedTx.total_amount,
        status: updatedTx.status,
        ai_confidence: updatedTx.ai_confidence,
        needs_review: updatedTx.needs_review,
        is_suspected_duplicate: updatedTx.is_suspected_duplicate || false,
        ...updatedTx, // Include all fields
      },
      status: updatedTx.status || nextStatus,
      needs_review: updatedTx.needs_review !== undefined ? updatedTx.needs_review : needsReview,
    }
    
    console.log('[Analyze Receipt] Returning response:', {
      success: response.success,
      transaction_id: response.transaction.id,
      vendor_name: response.transaction.vendor_name,
      status: response.status,
    })
    
    return NextResponse.json(response)
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Analyze Receipt] Error after', duration, 'ms:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId: id,
    })
    return NextResponse.json(
      { 
        error: 'Analyze failed', 
        message: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    )
  }
}

