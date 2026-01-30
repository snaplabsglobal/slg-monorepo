// ========================================
// Receipt Upload API - 完整版本 v2
// ========================================
// File: app/api/receipts/upload/route.ts
// Purpose: 处理收据上传 + Organization 自动创建 + Gemini 分析 + 存储
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 类型定义
interface GeminiAnalysisResult {
  vendor_name: string | null;
  vendor_alias: string | null;
  receipt_date: string | null;
  currency: string;
  subtotal_cents: number;
  gst_cents: number;
  pst_cents: number;
  total_cents: number;
  gifi_code_suggested: string | null;
  category: string;
  items: Array<{
    description: string;
    quantity: number;
    price_cents: number;
  }>;
  is_meals_50_deductible: boolean;
  is_shareholder_loan_potential: boolean;
  needs_review: boolean;
  confidence: {
    vendor_name: number;
    date: number;
    amounts: number;
    tax_split: number;
    overall: number;
  };
  raw_text: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // ========================================
    // 1. 验证用户认证
    // ========================================
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Upload API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to upload receipts' },
        { status: 401 }
      );
    }

    console.log('[Upload API] User authenticated:', user.id);

    // ========================================
    // 2. 获取或创建 Organization
    // ========================================
    
    // Step 2.1: 检查用户是否已有 Organization
    const { data: existingMembership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(id, name)')
      .eq('user_id', user.id)
      .single();

    let organizationId: string;

    if (membershipError || !existingMembership) {
      console.log('[Upload API] No organization found, creating default...');
      
      // Step 2.2: 创建默认 Organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const orgName = profile?.full_name 
        ? `${profile.full_name}'s Company`
        : profile?.email 
          ? `${profile.email.split('@')[0]}'s Company`
          : 'My Company';

      const { data: newOrg, error: orgError } = await supabase
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
        .select()
        .single();

      if (orgError || !newOrg) {
        console.error('[Upload API] Failed to create organization:', orgError);
        return NextResponse.json(
          { error: 'Organization creation failed', message: orgError?.message },
          { status: 500 }
        );
      }

      organizationId = newOrg.id;
      console.log('[Upload API] Created organization:', organizationId);

      // Step 2.3: 创建成员关系
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          role: 'Owner',
        });

      if (memberError) {
        console.error('[Upload API] Failed to create membership:', memberError);
        // 继续执行，因为 org 已创建
      }

      console.log('[Upload API] User added as Owner to organization');
    } else {
      organizationId = existingMembership.organization_id;
      console.log('[Upload API] Using existing organization:', organizationId);
    }

    // ========================================
    // 3. 解析表单数据
    // ========================================
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', message: 'Please select a receipt image' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: 'Only JPEG, PNG, WebP, and HEIC images are supported'
        },
        { status: 400 }
      );
    }

    // 验证文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large',
          message: 'Maximum file size is 10MB'
        },
        { status: 400 }
      );
    }

    console.log('[Upload API] File validated:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // ========================================
    // 4. 上传到 Cloudflare R2 (或其他存储)
    // ========================================
    
    // TODO: 实际实现 R2 上传
    // 现在先用模拟 URL
    const fileName = `${organizationId}/${user.id}/${Date.now()}-${file.name}`;
    const imageUrl = `https://storage.example.com/${fileName}`;
    
    console.log('[Upload API] Image uploaded (simulated):', imageUrl);

    // ========================================
    // 5. 调用 Gemini 分析
    // ========================================
    
    console.log('[Upload API] Starting Gemini analysis...');
    
    // TODO: 实际调用 Gemini API
    // 现在返回模拟数据
    const geminiResult: GeminiAnalysisResult = {
      vendor_name: 'Home Depot #7133',
      vendor_alias: 'Home Depot',
      receipt_date: new Date().toISOString().split('T')[0],
      currency: 'CAD',
      subtotal_cents: 4500,
      gst_cents: 225,
      pst_cents: 315,
      total_cents: 5040,
      gifi_code_suggested: '8320',
      category: 'Office Supplies',
      items: [
        {
          description: '2x4 Lumber',
          quantity: 10,
          price_cents: 4500,
        },
      ],
      is_meals_50_deductible: false,
      is_shareholder_loan_potential: false,
      needs_review: false,
      confidence: {
        vendor_name: 0.98,
        date: 0.95,
        amounts: 0.92,
        tax_split: 0.90,
        overall: 0.94,
      },
      raw_text: 'HOME DEPOT #7133\nDate: 2026-01-28\nSubtotal: $45.00\nGST: $2.25\nPST: $3.15\nTotal: $50.40',
    };

    console.log('[Upload API] Gemini analysis complete:', {
      vendor: geminiResult.vendor_name,
      total: geminiResult.total_cents,
      confidence: geminiResult.confidence.overall,
    });

    // ========================================
    // 6. 转换为 Transaction 格式
    // ========================================
    
    const transactionData = {
      organization_id: organizationId,
      user_id: user.id,
      created_by: user.id,
      project_id: projectId,
      
      // 基本信息
      transaction_date: geminiResult.receipt_date || new Date().toISOString().split('T')[0],
      direction: 'expense' as const,
      source_app: 'ledgersnap',
      
      // 金额 (转换为美元)
      total_amount: geminiResult.total_cents / 100,
      tax_amount: geminiResult.gst_cents / 100, // GST only for ITC
      
      // 税务详情 (JSONB)
      tax_details: {
        gst_cents: geminiResult.gst_cents,
        gst_amount: geminiResult.gst_cents / 100,
        gst_rate: 0.05,
        pst_cents: geminiResult.pst_cents,
        pst_amount: geminiResult.pst_cents / 100,
        pst_rate: 0.07,
        total_tax_cents: geminiResult.gst_cents + geminiResult.pst_cents,
        bc_province: true,
        tax_split_confidence: geminiResult.confidence.tax_split,
      },
      
      currency: geminiResult.currency,
      original_currency: geminiResult.currency,
      
      // 分类
      category_user: geminiResult.category,
      expense_type: geminiResult.is_shareholder_loan_potential ? 'personal' : 'business',
      is_tax_deductible: !geminiResult.is_shareholder_loan_potential,
      
      // 商户
      vendor_name: geminiResult.vendor_name,
      
      // 图片
      attachment_url: imageUrl,
      image_mime_type: file.type,
      image_size_bytes: file.size,
      
      // AI 识别
      entry_source: 'ocr' as const,
      ai_confidence: geminiResult.confidence.overall,
      
      // JSONB 完整数据
      raw_data: {
        gemini_version: '2.0-flash',
        extracted_at: new Date().toISOString(),
        amounts_cents: {
          subtotal: geminiResult.subtotal_cents,
          gst: geminiResult.gst_cents,
          pst: geminiResult.pst_cents,
          total: geminiResult.total_cents,
        },
        accounting: {
          gifi_code: geminiResult.gifi_code_suggested,
          vendor_alias: geminiResult.vendor_alias,
          is_meals_50_deductible: geminiResult.is_meals_50_deductible,
          is_shareholder_loan_potential: geminiResult.is_shareholder_loan_potential,
        },
        confidence: geminiResult.confidence,
        raw_text: geminiResult.raw_text,
        gemini_raw_response: geminiResult,
      },
      
      // 状态
      status: 'pending',
      needs_review: geminiResult.needs_review || geminiResult.confidence.overall < 0.9,
      is_reimbursable: false,
    };

    console.log('[Upload API] Transaction data prepared');

    // ========================================
    // 7. 保存到数据库
    // ========================================
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('[Upload API] Failed to insert transaction:', transactionError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: transactionError.message,
          details: transactionError.details 
        },
        { status: 500 }
      );
    }

    console.log('[Upload API] Transaction saved:', transaction.id);

    // ========================================
    // 8. 保存 Line Items (如果有)
    // ========================================
    
    if (geminiResult.items.length > 0) {
      const items = geminiResult.items.map(item => ({
        transaction_id: transaction.id,
        organization_id: organizationId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price_cents / 100,
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);

      if (itemsError) {
        console.error('[Upload API] Failed to insert items:', itemsError);
        // 不终止请求，items 是可选的
      } else {
        console.log(`[Upload API] Inserted ${items.length} line items`);
      }
    }

    // ========================================
    // 9. 更新 Organization 使用统计
    // ========================================
    
    await supabase.rpc('increment_receipt_count', {
      org_id: organizationId,
    }).catch(err => {
      console.error('[Upload API] Failed to update usage stats:', err);
      // 不终止请求
    });

    // ========================================
    // 10. 返回成功响应
    // ========================================
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        vendor_name: transaction.vendor_name,
        transaction_date: transaction.transaction_date,
        total_amount: transaction.total_amount,
        currency: transaction.currency,
        category: transaction.category_user,
        gifi_code: geminiResult.gifi_code_suggested,
        confidence: geminiResult.confidence,
        needs_review: transaction.needs_review,
        image_url: transaction.attachment_url,
      },
      organization_id: organizationId,
      message: transaction.needs_review
        ? 'Receipt uploaded. Please review the details.'
        : 'Receipt uploaded and verified successfully!',
    });

  } catch (error: any) {
    console.error('[Upload API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        message: error.message || 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ========================================
// GET: 检查 API 状态
// ========================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/receipts/upload',
    methods: ['POST'],
    description: 'Upload receipt image for AI analysis',
  });
}
