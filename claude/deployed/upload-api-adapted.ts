// ========================================
// Receipt Upload API (Adapted for existing database)
// ========================================
// File: app/api/receipts/upload/route.ts
// Purpose: Handle receipt upload with Gemini analysis
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/cloudflare-r2';
import { analyzeReceiptWithRetry } from '@/lib/gemini/receipt-analyzer';
import {
  geminiResultToTransaction,
  geminiItemsToTransactionItems,
  validateTransactionData,
} from '@/lib/adapters/receipt-to-transaction';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get organization membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 403 }
      );
    }

    const organizationId = membership.organization_id;

    // 3. Parse uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 4. Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.' },
        { status: 400 }
      );
    }

    // 5. Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // 6. Upload to Cloudflare R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${organizationId}/${user.id}/${Date.now()}-${file.name}`;
    const imageUrl = await uploadToR2(buffer, fileName, file.type);

    // 7. Analyze with Gemini 2.0 Flash
    console.log('Analyzing receipt with Gemini...');
    const geminiResult = await analyzeReceiptWithRetry(buffer, file.type);
    console.log('Gemini analysis complete:', {
      vendor: geminiResult.vendor_name,
      total: geminiResult.total_cents,
      confidence: geminiResult.confidence.overall,
    });

    // 8. Convert to Transaction format
    const transactionData = geminiResultToTransaction(
      geminiResult,
      organizationId,
      user.id,
      imageUrl,
      projectId
    );

    // 9. Validate data
    const validation = validateTransactionData(transactionData);
    if (!validation.valid) {
      console.error('Transaction validation failed:', validation.errors);
      return NextResponse.json(
        { 
          error: 'Invalid transaction data',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // 10. Insert into transactions table
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('Failed to insert transaction:', transactionError);
      throw transactionError;
    }

    console.log('Transaction created:', transaction.id);

    // 11. Insert transaction items (if any)
    if (geminiResult.items.length > 0) {
      const items = geminiItemsToTransactionItems(
        geminiResult.items,
        transaction.id,
        organizationId
      );

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);

      if (itemsError) {
        console.error('Failed to insert items:', itemsError);
        // Don't fail the whole request, just log the error
      } else {
        console.log(`Inserted ${items.length} transaction items`);
      }
    }

    // 12. Log to ML training data (for future model improvement)
    try {
      await supabase.from('ml_training_data').insert({
        organization_id: organizationId,
        transaction_id: transaction.id,
        original_extraction: geminiResult,
        ai_model_version: 'gemini-2.0-flash',
        ai_confidence: geminiResult.confidence.overall,
        corrected_data: {},  // Will be filled when user makes corrections
        correction_fields: [],
        is_training_ready: false,
      });
    } catch (mlError) {
      console.error('Failed to log to ML training data:', mlError);
      // Non-critical, continue
    }

    // 13. Return success response
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        vendor_name: transaction.vendor_name,
        transaction_date: transaction.transaction_date,
        total_amount: transaction.total_amount,
        currency: transaction.currency,
        category: transaction.category_user,
        confidence: geminiResult.confidence,
        needs_review: transaction.needs_review,
        image_url: transaction.attachment_url,
      },
      analysis: geminiResult,
      message: transaction.needs_review 
        ? 'Receipt uploaded. Please review the details before approving.'
        : 'Receipt uploaded and verified successfully!',
    });

  } catch (error: any) {
    console.error('Receipt upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process receipt',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// ========================================
// GET: Retrieve receipt details
// ========================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const needsReview = searchParams.get('needs_review');

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', membership.organization_id)
      .eq('direction', 'expense')
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (category) {
      query = query.eq('category_user', category);
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    if (needsReview === 'true') {
      query = query.eq('needs_review', true);
    }

    if (search) {
      query = query.or(
        `vendor_name.ilike.%${search}%,internal_notes.ilike.%${search}%`
      );
    }

    const { data: transactions, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('Fetch receipts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}
