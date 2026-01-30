// app/api/receipts/upload/route.ts
// Receipt upload and AI analysis API
// Uploads to R2, analyzes with Gemini, saves to transactions table

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@slo/snap-auth';
import { uploadToR2, generateFilePath } from '@/app/lib/storage/r2';
import { analyzeReceiptWithGemini, type ReceiptAnalysisResult } from '../_gemini'

export async function POST(request: NextRequest) {
  try {
    // NOTE: Supabase generated `Database` types may lag behind migrations in this repo.
    // Cast to `any` in API routes to avoid `never` inference breaking builds.
    const supabase = (await createServerClient()) as any;
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Upload API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to upload receipts' },
        { status: 401 }
      );
    }

    console.log('[Upload API] User authenticated:', { user_id: user.id, email: user.email });

    // Get or create user's organization
    let organizationId: string;
    
    // First, try to find existing organization membership
    const { data: orgMember, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

    console.log('[Upload API] Organization membership check:', {
      hasMember: !!orgMember,
      orgId: orgMember?.organization_id,
      error: membershipError ? {
        code: membershipError.code,
        message: membershipError.message,
        details: membershipError.details,
      } : null,
    });

    if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 = no rows returned
      // Real error, not just "not found"
      console.error('[Upload API] Error checking organization membership:', membershipError);
      return NextResponse.json(
        { 
          error: 'Failed to check organization membership', 
          message: membershipError.message 
        },
        { status: 500 }
      );
    }

    if (!orgMember || !orgMember.organization_id) {
      // Auto-create organization if user doesn't have one
      console.log('[Upload API] No organization found, creating default...');
      
      // Get user profile for organization name (optional - don't fail if this fails)
      let profileName: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        profileName = profile?.full_name || null;
      } catch (profileError: any) {
        console.log('[Upload API] Profile query failed (non-critical):', profileError?.message);
        // Continue without profile
      }

      const orgName = profileName 
        ? `${profileName}'s Company`
        : user.email 
          ? `${user.email.split('@')[0]}'s Company`
          : 'My Company';

      console.log('[Upload API] Creating organization:', { name: orgName, user_id: user.id });

      // Try using RPC function first (preferred method - bypasses RLS)
      let orgIdData: string | null = null;
      let orgError: any = null;
      
      try {
        console.log('[Upload API] Attempting RPC call to create_user_organization');
        const rpcResult = await supabase
          .rpc('create_user_organization', {
            p_user_id: user.id,
            p_org_name: orgName,
          });
        
        console.log('[Upload API] RPC result:', { 
          error: rpcResult.error, 
          data: rpcResult.data,
          hasError: !!rpcResult.error,
          hasData: !!rpcResult.data
        });
        
        if (!rpcResult.error && rpcResult.data) {
          orgIdData = rpcResult.data;
          console.log('[Upload API] RPC call successful, org ID:', orgIdData);
        } else {
          orgError = rpcResult.error;
          console.warn('[Upload API] RPC call failed:', {
            code: orgError?.code,
            message: orgError?.message,
            details: orgError?.details,
            hint: orgError?.hint,
          });
        }
      } catch (rpcErr: any) {
        console.warn('[Upload API] RPC call exception:', {
          message: rpcErr.message,
          stack: rpcErr.stack,
        });
        orgError = rpcErr;
      }

      // Fallback: Direct insert if RPC fails
      if (orgError || !orgIdData) {
        console.log('[Upload API] Using fallback method to create organization');
        console.log('[Upload API] RPC error was:', orgError);
        
        // Create organization directly (RLS policy allows: auth.uid() = owner_id)
        const { data: newOrg, error: insertError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            owner_id: user.id, // Must match auth.uid() for RLS policy
            plan: 'Free',
            usage_metadata: {
              project_limit: 1,
              receipt_count: 0,
            },
          })
          .select('id')
          .single();

        if (insertError || !newOrg) {
          const errorDetails = {
            rpc_error: orgError ? {
              code: orgError?.code,
              message: orgError?.message,
              details: orgError?.details,
              hint: orgError?.hint,
            } : null,
            insert_error: insertError ? {
              code: insertError?.code,
              message: insertError?.message,
              details: insertError?.details,
              hint: insertError?.hint,
            } : null,
            user_id: user.id,
            user_email: user.email,
            org_name: orgName,
          };
          console.error('[Upload API] Failed to create organization:', JSON.stringify(errorDetails, null, 2));
          
          // Return detailed error in development, simplified in production
          const isDev = process.env.NODE_ENV === 'development';
          return NextResponse.json(
            { 
              error: 'Organization creation failed', 
              message: insertError?.message || orgError?.message || 'Failed to create organization. Please ensure you are logged in and try again.',
              ...(isDev && {
                details: insertError?.details || orgError?.details,
                hint: insertError?.hint || orgError?.hint,
                code: insertError?.code || orgError?.code,
                rpc_error: orgError,
                insert_error: insertError,
              }),
            },
            { status: 500 }
          );
        }

        organizationId = newOrg.id;
        console.log('[Upload API] Created organization via fallback:', organizationId);

        // Create membership
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            role: 'Owner',
          });

        if (memberError) {
          console.error('[Upload API] Failed to create membership:', {
            code: memberError?.code,
            message: memberError?.message,
            details: memberError?.details,
            hint: memberError?.hint,
          });
          // Continue anyway, org is created - user can be added later
        } else {
          console.log('[Upload API] User added as Owner to organization');
        }
      } else {
        organizationId = orgIdData;
        console.log('[Upload API] Created organization via RPC:', organizationId);
      }
    } else {
      organizationId = orgMember.organization_id;
      console.log('[Upload API] Using existing organization:', organizationId);
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', message: 'Please select a receipt image to upload' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', message: 'Please upload JPEG, PNG, or WebP images only' },
        { status: 400 }
      );
    }

    // Upload file to storage (R2 or Supabase Storage fallback)
    const filename = file.name || `receipt-${Date.now()}.${file.type.split('/')[1]}`;
    const filePath = generateFilePath({
      folder: 'receipts',
      organizationId: organizationId,
      filename,
    });

    const fileBuffer = await file.arrayBuffer();
    let fileUrl: string;

    // Try R2 first, fallback to Supabase Storage if R2 not configured
    try {
      const r2Result = await uploadToR2(
        fileBuffer,
        filePath,
        file.type,
        {
          uploadedBy: user.id,
          organizationId: organizationId,
          originalFilename: file.name,
        }
      );
      fileUrl = r2Result.fileUrl;
      console.log('[Upload API] File uploaded to R2:', fileUrl);
    } catch (r2Error: any) {
      // Fallback to Supabase Storage if R2 not configured
      if (r2Error.message?.includes('Cloudflare R2 credentials not configured')) {
        console.log('[Upload API] R2 not configured, using Supabase Storage fallback');
        
        // Upload to Supabase Storage (fallback)
        // Note: Bucket name is 'receipt-images' based on migration schema
        const storagePath = `${organizationId}/${Date.now()}-${filename}`;
        const bucketName = 'receipt-images';
        
        const { data: uploadData, error: storageError } = await supabase
          .storage
          .from(bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (storageError || !uploadData) {
          console.error('[Upload API] Supabase Storage upload failed:', storageError);
          
          // If bucket doesn't exist, provide helpful error message
          if (storageError?.message?.includes('Bucket not found') || storageError?.statusCode === 404) {
            return NextResponse.json(
              { 
                error: 'Storage bucket not found', 
                message: `Please create the '${bucketName}' bucket in Supabase Storage, or configure Cloudflare R2 credentials.`,
                details: process.env.NODE_ENV === 'development' ? {
                  bucket_name: bucketName,
                  r2_error: r2Error.message,
                  storage_error: storageError,
                } : undefined,
              },
              { status: 500 }
            );
          }
          
          return NextResponse.json(
            { 
              error: 'File upload failed', 
              message: storageError?.message || 'Failed to upload file to storage',
              details: process.env.NODE_ENV === 'development' ? {
                r2_error: r2Error.message,
                storage_error: storageError,
              } : undefined,
            },
            { status: 500 }
          );
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from(bucketName)
          .getPublicUrl(storagePath);

        fileUrl = publicUrl;
        console.log('[Upload API] File uploaded to Supabase Storage:', fileUrl);
      } else {
        // Other R2 errors - rethrow
        throw r2Error;
      }
    }

    // Analyze receipt with Gemini
    let analysis: ReceiptAnalysisResult | null = null;
    try {
      analysis = await analyzeReceiptWithGemini(fileBuffer, file.type);
    } catch (error: any) {
      console.error('Gemini analysis error:', error);
      // Continue even if analysis fails - user can edit later
    }

    // Create transaction record
    let transactionId: string | null = null;
    if (analysis) {
      // ===== 金额处理：使用绝对值，保留原始值在 raw_data =====
      // 确保所有金额都是正数（符合数据库约束或业务逻辑）
      // 原始值（可能为负数，表示退款）保留在 raw_data.amounts_cents 中
      const subtotalCents = Math.abs(analysis.subtotal_cents || 0);
      const gstCents = Math.abs(analysis.gst_cents || 0);
      const pstCents = Math.abs(analysis.pst_cents || 0);
      const totalCents = Math.abs(analysis.total_cents || 0);

      // 验证金额合理性
      if (totalCents === 0) {
        console.warn('[Upload API] Total amount is zero, this might be an OCR error');
      }

      // 验证税额是否合理（可选但推荐）
      const expectedGST = Math.round(subtotalCents * 0.05);
      const expectedPST = Math.round(subtotalCents * 0.07);
      const gstDiff = Math.abs(gstCents - expectedGST);
      const pstDiff = Math.abs(pstCents - expectedPST);

      // 如果税额差异过大，标记需要审核
      const taxMismatch = gstDiff > 50 || pstDiff > 50; // 差异超过 $0.50

      // 检测是否为退款（原始金额为负数）
      const isRefund = (analysis.total_cents || 0) < 0;

      const transactionData = {
        organization_id: organizationId,
        user_id: user.id,
        created_by: user.id,
        project_id: projectId || null,
        transaction_date: analysis.transaction_date || new Date().toISOString().split('T')[0],
        direction: 'expense' as const,
        source_app: 'ls-web',
        // ✅ 使用绝对值确保金额为正数
        total_amount: totalCents / 100,
        tax_amount: gstCents / 100, // GST only for ITC
        currency: analysis.currency || 'CAD',
        vendor_name: analysis.vendor_name,
        category_user: analysis.category,
        attachment_url: fileUrl,
        entry_source: 'ocr',
        ai_confidence: analysis.confidence.overall,
        needs_review: taxMismatch || analysis.needs_review || !analysis.vendor_name || (analysis.confidence.overall || 0) < 0.9,
        status: (taxMismatch || analysis.needs_review || !analysis.vendor_name || (analysis.confidence.overall || 0) < 0.9) ? 'pending' : 'approved',
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
          tax_mismatch: taxMismatch, // 标记税额异常
        },
        raw_data: {
          // 保留原始值（可能为负数，表示退款）
          amounts_cents: {
            subtotal: analysis.subtotal_cents,
            gst: analysis.gst_cents,
            pst: analysis.pst_cents,
            total: analysis.total_cents,
          },
          // 新增：绝对值记录
          amounts_absolute: {
            subtotal: subtotalCents,
            gst: gstCents,
            pst: pstCents,
            total: totalCents,
          },
          is_refund: isRefund, // 标记是否为退款
          accounting: {
            gifi_code: analysis.gifi_code_suggested,
            vendor_alias: analysis.vendor_alias,
            is_meals_50_deductible: analysis.is_meals_50_deductible,
            is_shareholder_loan_potential: analysis.is_shareholder_loan_potential,
          },
          confidence: analysis.confidence,
          raw_text: analysis.raw_text,
        },
      };

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (txError) {
        console.error('[Upload API] Failed to create transaction:', {
          error: txError,
          code: txError?.code,
          message: txError?.message,
          details: txError?.details,
          hint: txError?.hint,
          transactionData: {
            organization_id: transactionData.organization_id,
            user_id: transactionData.user_id,
            direction: transactionData.direction,
            total_amount: transactionData.total_amount,
          },
        });
        throw txError;
      }

      transactionId = transaction.id;
      console.log('[Upload API] ============================================');
      console.log('[Upload API] Transaction created successfully:', {
        transaction_id: transaction.id,
        organization_id: transaction.organization_id,
        user_id: transaction.user_id,
        vendor_name: transaction.vendor_name,
        total_amount: transaction.total_amount,
        transaction_date: transaction.transaction_date,
        direction: transaction.direction,
        status: transaction.status,
        is_refund: isRefund,
        tax_mismatch: taxMismatch,
        original_total_cents: analysis.total_cents,
        absolute_total_cents: totalCents,
      });
      if (isRefund) {
        console.log('[Upload API] ⚠️  Refund detected - original amount was negative, converted to positive');
      }
      if (taxMismatch) {
        console.log('[Upload API] ⚠️  Tax mismatch detected - GST/PST may be incorrect, marked for review');
      }
      console.log('[Upload API] ============================================');

      // Create transaction items if available
      if (analysis.items && analysis.items.length > 0) {
        const items = analysis.items.map(item => ({
          transaction_id: transaction.id,
          organization_id: organizationId, // Required field for RLS policies
          description: item.description,
          quantity: item.quantity,
          // ✅ 使用绝对值确保单价为正数
          unit_price: Math.abs(item.price_cents || 0) / 100, // Convert cents to dollars
          // Note: 'amount' is a GENERATED column, calculated automatically from quantity * unit_price
          // Do not include it in the insert
        }));

        const { error: itemsError } = await supabase.from('transaction_items').insert(items);
        if (itemsError) {
          console.error('[Upload API] Failed to insert transaction items:', itemsError);
          // Don't fail the request, items are optional
        } else {
          console.log(`[Upload API] Inserted ${items.length} transaction items`);
        }
      }

      // Log to ML training data
      await supabase.from('ml_training_data').insert({
        organization_id: organizationId,
        transaction_id: transaction.id,
        input_data: {
          image_url: fileUrl,
          raw_text: analysis.raw_text,
        },
        output_data: analysis,
        ai_model: 'gemini-2.5-flash',
        ai_confidence: analysis.confidence.overall,
        needs_review: analysis.needs_review,
      });
    } else {
      // Create transaction without analysis (user can analyze later)
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          created_by: user.id,
          project_id: projectId || null,
          transaction_date: new Date().toISOString().split('T')[0],
          direction: 'expense',
          source_app: 'ls-web',
          total_amount: 0,
          currency: 'CAD',
          attachment_url: fileUrl,
          entry_source: 'manual',
          status: 'pending',
          needs_review: true,
        })
        .select()
        .single();

      if (txError) {
        console.error('[Upload API] Failed to create transaction (no analysis):', {
          error: txError,
          code: txError?.code,
          message: txError?.message,
          details: txError?.details,
        });
        throw txError;
      }

      transactionId = transaction.id;
      console.log('[Upload API] ============================================');
      console.log('[Upload API] Transaction created (no analysis):', {
        transaction_id: transaction.id,
        organization_id: transaction.organization_id,
        user_id: transaction.user_id,
        direction: transaction.direction,
        status: transaction.status,
        needs_review: transaction.needs_review,
      });
      console.log('[Upload API] ============================================');
    }

    return NextResponse.json({
      success: true,
      receipt: {
        id: transactionId,
        image_url: fileUrl,
        analysis: analysis ? {
          merchant_name: analysis.vendor_name,
          receipt_date: analysis.transaction_date,
          total_amount: analysis.total_cents / 100,
          category: analysis.category,
          confidence: analysis.confidence.overall,
        } : null,
      },
    });

  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload and analyze receipt', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
