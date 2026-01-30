// app/api/receipts/quick-upload/route.ts
// Capture First, Process Later: fast upload + create pending transaction (no Gemini)
// Three-Layer Duplicate Prevention: Image Hash + Client ID + Fuzzy Matching

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import { uploadToR2, generateFilePath } from '@slo/snap-storage/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[Quick Upload] Request received at:', new Date().toISOString())
  
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Quick Upload] Unauthorized:', { authError, hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Quick Upload] User authenticated:', { userId: user.id, email: user.email })

    // Get or create user's organization (same logic as /api/receipts/upload)
    let organizationId: string

    // NOTE: Supabase generated `Database` types may lag behind migrations in this repo.
    // Cast to `any` in API routes to avoid `never` inference breaking builds.
    const { data: orgMember, error: membershipError } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError && membershipError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check organization membership', message: membershipError.message },
        { status: 500 }
      )
    }

    if (!(orgMember as any)?.organization_id) {
      // create org name (best effort)
      let profileName: string | null = null
      try {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()
        profileName = profile?.full_name || null
      } catch {
        // ignore
      }

      const orgName = profileName
        ? `${profileName}'s Company`
        : user.email
          ? `${user.email.split('@')[0]}'s Company`
          : 'My Company'

      // Try RPC first
      let orgIdData: string | null = null
      let orgError: any = null

      try {
        const rpcResult = await (supabase as any).rpc('create_user_organization', {
          p_user_id: user.id,
          p_org_name: orgName,
        })
        if (!rpcResult.error && rpcResult.data) {
          orgIdData = rpcResult.data
        } else {
          orgError = rpcResult.error
        }
      } catch (e: any) {
        orgError = e
      }

      if (orgError || !orgIdData) {
        const { data: newOrg, error: insertError } = await (supabase as any)
          .from('organizations')
          .insert({
            name: orgName,
            owner_id: user.id,
            plan: 'Free',
            usage_metadata: {
              project_limit: 1,
              receipt_count: 0,
            },
          })
          .select('id')
          .single()

        if (insertError || !newOrg) {
          return NextResponse.json(
            {
              error: 'Organization creation failed',
              message:
                insertError?.message ||
                orgError?.message ||
                'Failed to create organization. Please try again.',
            },
            { status: 500 }
          )
        }

        organizationId = newOrg.id

        // best-effort membership
        await (supabase as any).from('organization_members').insert({
          organization_id: organizationId,
          user_id: user.id,
          role: 'Owner',
        })
      } else {
        organizationId = orgIdData
      }
    } else {
      organizationId = (orgMember as any).organization_id
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = (formData.get('projectId') as string | null) || null
    const clientId = (formData.get('client_id') as string | null) || null

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    // Layer 2: Check client_id idempotency (if provided)
    // Note: Only check if client_id column exists (migration may not be applied yet)
    if (clientId) {
      try {
        const { data: existingByClientId, error: clientIdCheckError } = await (supabase as any)
          .from('transactions')
          .select('id, status')
          .eq('client_id', clientId)
          .eq('organization_id', organizationId)
          .maybeSingle()

        // If column doesn't exist, skip client_id check (backward compatibility)
        if (clientIdCheckError && clientIdCheckError.message?.includes('client_id') && clientIdCheckError.message?.includes('schema cache')) {
          console.warn('[Quick Upload] client_id column not found, skipping idempotency check. Please run migration 20260129000004_duplicate_prevention.sql')
        } else if (existingByClientId) {
          console.log('[Quick Upload] Duplicate client_id detected, returning existing transaction:', existingByClientId.id)
          return NextResponse.json({
            success: true,
            transaction: {
              id: existingByClientId.id,
              status: existingByClientId.status,
            },
            message: '已收到（幂等性检查通过）',
            duplicate: true,
          })
        }
      } catch (err: any) {
        // If column doesn't exist, just log and continue
        if (err?.message?.includes('client_id') && err?.message?.includes('schema cache')) {
          console.warn('[Quick Upload] client_id column not found, skipping idempotency check')
        } else {
          throw err
        }
      }
    }

    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Upload file to storage (R2 or Supabase Storage fallback)
    const filename = file.name || `receipt-${Date.now()}.${file.type.split('/')[1] || 'jpg'}`
    const filePath = generateFilePath({
      folder: 'receipts',
      organizationId,
      filename,
    })

    const fileBuffer = await file.arrayBuffer()
    
    // Layer 1: Calculate image hash (SHA-256) for physical deduplication
    const imageHash = createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex')
    console.log('[Quick Upload] Image hash calculated:', imageHash.substring(0, 16) + '...')
    
    // Check for duplicate image hash
    const { data: existingByHash } = await (supabase as any)
      .from('transactions')
      .select('id, status, vendor_name, total_amount, transaction_date')
      .eq('image_hash', imageHash)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingByHash) {
      console.log('[Quick Upload] Duplicate image hash detected:', existingByHash.id)
      return NextResponse.json({
        success: false,
        error: 'DUPLICATE_IMAGE',
        message: '这张收据已经上传过了',
        existing_transaction: {
          id: existingByHash.id,
          status: existingByHash.status,
          vendor_name: existingByHash.vendor_name,
          total_amount: existingByHash.total_amount,
          transaction_date: existingByHash.transaction_date,
        },
      }, { status: 409 }) // 409 Conflict
    }
    
    let fileUrl: string

    try {
      const r2Result = await uploadToR2(fileBuffer, filePath, file.type, {
        uploadedBy: user.id,
        organizationId,
        originalFilename: file.name,
      })
      fileUrl = r2Result.fileUrl
    } catch (r2Error: any) {
      if (r2Error.message?.includes('Cloudflare R2 credentials not configured')) {
        const storagePath = `${organizationId}/${Date.now()}-${filename}`
        const bucketName = 'receipt-images'
        const { data: uploadData, error: storageError } = await (supabase as any).storage
          .from(bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
          })

        if (storageError || !uploadData) {
          return NextResponse.json(
            { error: 'File upload failed', message: storageError?.message || r2Error.message },
            { status: 500 }
          )
        }

        const {
          data: { publicUrl },
        } = (supabase as any).storage.from(bucketName).getPublicUrl(storagePath)
        fileUrl = publicUrl
      } else {
        throw r2Error
      }
    }

    // Create pending transaction immediately (no Gemini)
    const today = new Date().toISOString().split('T')[0]
    
    // Build insert data - conditionally include client_id if provided
    // (will fail gracefully if column doesn't exist, but we handle that in error handling)
    const insertData: any = {
      organization_id: organizationId,
      user_id: user.id,
      created_by: user.id,
      project_id: projectId,
      transaction_date: today,
      direction: 'expense',
      source_app: 'ls-web',
      total_amount: 0,
      tax_amount: 0,
      currency: 'CAD',
      vendor_name: 'Processing...',
      attachment_url: fileUrl,
      entry_source: 'ocr',
      ai_confidence: 0,
      needs_review: true,
      status: 'pending',
      image_hash: imageHash, // Layer 1: Image hash (UNIQUE constraint will prevent duplicates)
      raw_data: {
        capture: {
          original_filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
          captured_at: new Date().toISOString(),
        },
      },
    }
    
    // Only include client_id if provided (migration may not be applied yet)
    if (clientId) {
      insertData.client_id = clientId // Layer 2: Client ID for idempotency
    }
    
    try {
      const { data: transaction, error: txError } = await (supabase as any)
        .from('transactions')
        .insert(insertData)
        .select('id, organization_id, status')
        .single()

      if (txError) {
        // Check if error is due to missing client_id column (migration not applied)
        if (txError.message?.includes('client_id') && txError.message?.includes('schema cache')) {
          console.error('[Quick Upload] client_id column not found in database. Retrying without client_id...')
          // Retry without client_id (backward compatibility)
          const insertDataWithoutClientId = { ...insertData }
          delete insertDataWithoutClientId.client_id
          
          const { data: transactionRetry, error: txErrorRetry } = await (supabase as any)
            .from('transactions')
            .insert(insertDataWithoutClientId)
            .select('id, organization_id, status')
            .single()
          
          if (txErrorRetry) {
            throw txErrorRetry
          }
          
          return NextResponse.json({
            success: true,
            transaction: {
              id: transactionRetry.id,
              status: transactionRetry.status,
            },
            message: '已收到，正在后台识别（注意：client_id 列不存在，请运行迁移）',
          })
        }
        
        // Check if error is due to duplicate image_hash or client_id
        if (txError.code === '23505') { // Unique violation
          if (txError.message?.includes('image_hash')) {
            console.log('[Quick Upload] Duplicate image_hash (caught by DB constraint)')
            return NextResponse.json({
              success: false,
              error: 'DUPLICATE_IMAGE',
              message: '这张收据已经上传过了',
            }, { status: 409 })
          } else if (txError.message?.includes('client_id')) {
            console.log('[Quick Upload] Duplicate client_id (caught by DB constraint)')
            // Return existing transaction (only if client_id column exists)
            try {
              const { data: existing } = await (supabase as any)
                .from('transactions')
                .select('id, status')
                .eq('client_id', clientId)
                .eq('organization_id', organizationId)
                .single()
              return NextResponse.json({
                success: true,
                transaction: existing,
                message: '已收到（幂等性检查通过）',
                duplicate: true,
              })
            } catch (err: any) {
              // If client_id column doesn't exist, just continue with normal error
              console.warn('[Quick Upload] Could not fetch existing transaction by client_id:', err)
            }
          }
        }
        throw txError
      }

      if (!transaction) {
        return NextResponse.json(
          { error: 'Failed to create pending transaction' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction.id,
          status: transaction.status,
        },
        message: '已收到，正在后台识别',
      })
    } catch (insertError: any) {
      // Handle any other insertion errors
      console.error('[Quick Upload] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create pending transaction', message: insertError?.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Quick Upload] Error after', duration, 'ms:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        message: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    )
  }
}

