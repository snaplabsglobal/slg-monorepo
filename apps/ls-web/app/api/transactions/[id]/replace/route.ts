// app/api/transactions/[id]/replace/route.ts
// Replace receipt image (Layer 2)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { uploadToR2, generateFilePath } from '@slo/snap-storage/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Load current transaction for history + lock checks
    const { data: current } = await supabase
      .from('transactions')
      .select('id,organization_id,status,attachment_url,raw_data')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (current.status === 'exported' || current.status === 'locked' || current.status === 'voided') {
      return NextResponse.json({ error: 'This record is locked and cannot be replaced' }, { status: 409 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const reason = (form.get('reason') as string) || 'Image replaced'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const filePath = generateFilePath({
      organizationId: membership.organization_id,
      userId: user.id,
      filename: file.name || 'receipt.jpg',
      prefix: 'receipts',
    } as any)

    const upload = await uploadToR2(buf, filePath, file.type || 'image/jpeg', {
      uploadedBy: user.id,
      organizationId: membership.organization_id,
      originalFilename: file.name,
    })

    const prevRaw = (current.raw_data || {}) as any
    const history = Array.isArray(prevRaw.image_history) ? prevRaw.image_history : []

    const newRaw = {
      ...prevRaw,
      image_history: [
        ...history,
        current.attachment_url
          ? {
              url: current.attachment_url,
              replaced_at: new Date().toISOString(),
              replaced_by: user.id,
              reason,
            }
          : null,
      ].filter(Boolean),
    }

    const { data: updated, error } = await supabase
      .from('transactions')
      .update({
        attachment_url: upload.fileUrl,
        raw_data: newRaw,
        // reset async state (Layer: async status system)
        status: 'pending',
        needs_review: true,
        ai_confidence: 0,
        vendor_name: 'Analyzing...',
      })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ transaction: updated })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/replace:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

