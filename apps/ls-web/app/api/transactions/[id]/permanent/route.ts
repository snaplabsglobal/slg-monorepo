// app/api/transactions/[id]/permanent/route.ts
// Permanent (physical) delete - only for already soft-deleted records in Recycle Bin.
// CRA: User must confirm reason and type "PERMANENTLY DELETE".

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'

type Ctx = { params: Promise<{ id: string }> }

/** Extract R2 key from public URL (path after origin). */
function keyFromAttachmentUrl(url: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    const path = u.pathname
    return path.startsWith('/') ? path.slice(1) : path
  } catch {
    return null
  }
}

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

    const body = await request.json().catch(() => ({}))
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation.trim() : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

    if (confirmation !== 'PERMANENTLY DELETE') {
      return NextResponse.json(
        { error: 'Confirmation text must be exactly "PERMANENTLY DELETE"' },
        { status: 400 }
      )
    }

    const { data: current, error: fetchError } = await supabase
      .from('transactions')
      .select('id, organization_id, deleted_at, attachment_url')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!current.deleted_at) {
      return NextResponse.json(
        { error: 'Only soft-deleted records can be permanently deleted. Move to Recycle Bin first.' },
        { status: 409 }
      )
    }

    // Optional: delete attachment from R2
    const key = keyFromAttachmentUrl(current.attachment_url as string | null)
    if (key) {
      try {
        const { deleteFromR2 } = await import('@slo/snap-storage/server')
        await deleteFromR2(key)
      } catch (r2Err: any) {
        // Log but continue - DB row should still be removed
        if (!r2Err?.message?.includes('not configured')) {
          console.error('[Permanent delete] R2 delete failed:', r2Err)
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('organization_id', membership.organization_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reason: reason || undefined,
    })
  } catch (error: any) {
    console.error('Error in POST /api/transactions/[id]/permanent:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
