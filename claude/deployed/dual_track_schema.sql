-- ============================================
-- LedgerSnap - 标签 vs 会计科目双轨系统
-- ============================================
-- 设计理念：
-- 1. 标签（Tag）- 用户自定义，灵活多维
-- 2. 会计科目（Category）- 标准化，符合 CRA
-- 3. AI 自动映射，但用户可修改
-- 4. 导出时支持双轨报表
-- ============================================

-- 1. 标准会计科目表（符合加拿大税务标准）
CREATE TABLE IF NOT EXISTS accounting_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 科目信息
  code TEXT NOT NULL UNIQUE,           -- 'CAT-001'
  name_en TEXT NOT NULL,               -- 'Meals & Entertainment'
  name_fr TEXT,                        -- '餐饮和娱乐'（魁北克用）
  
  -- 分类层级
  parent_category_id UUID REFERENCES accounting_categories(id),
  level INTEGER DEFAULT 1,             -- 1=主类, 2=子类
  display_order INTEGER DEFAULT 0,
  
  -- 税务属性
  is_tax_deductible BOOLEAN DEFAULT true,
  tax_deduction_rate DECIMAL(3,2),    -- 0.50 = 50% 可抵扣
  
  -- CRA 相关
  cra_code TEXT,                       -- CRA T2125 表格代码
  cra_description TEXT,
  
  -- GST/HST 处理
  gst_applicable BOOLEAN DEFAULT true,
  pst_applicable BOOLEAN DEFAULT false,
  
  -- 行业特定
  industry_tags TEXT[],                -- ['construction', 'retail', 'restaurant']
  
  -- 系统标志
  is_system_category BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 标签和会计科目的映射规则
CREATE TABLE IF NOT EXISTS tag_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 映射关系
  tag_id UUID REFERENCES tags(id),
  category_id UUID REFERENCES accounting_categories(id),
  
  -- 映射来源
  mapping_source TEXT NOT NULL CHECK (mapping_source IN (
    'user_defined',      -- 用户手动设置
    'ai_suggested',      -- AI 建议
    'system_default',    -- 系统默认
    'ml_learned'         -- ML 学习得出
  )),
  
  -- 映射强度（用于 AI 推荐）
  confidence DECIMAL(3,2) DEFAULT 0.5,
  
  -- 使用统计
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- 组织级别（不同公司可能有不同映射）
  organization_id UUID REFERENCES organizations(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束
  UNIQUE(tag_id, category_id, organization_id)
);

-- 3. 收据的会计科目（与标签独立）
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES accounting_categories(id),
  
  -- 分类来源
  assignment_source TEXT NOT NULL CHECK (assignment_source IN (
    'user_manual',       -- 用户手动选择
    'ai_auto',           -- AI 自动分类
    'rule_based',        -- 基于规则
    'imported'           -- 导入时指定
  )),
  
  -- AI 置信度
  confidence_score DECIMAL(3,2),
  
  -- 用户确认
  user_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  
  -- 会计处理
  is_tax_deductible BOOLEAN,           -- 从 category 继承，但可覆盖
  tax_deduction_amount_cents BIGINT,   -- 实际可抵扣金额
  
  -- 备注
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- 约束：一张收据只能有一个会计科目
  UNIQUE(transaction_id)
);

-- 4. 供应商 → 会计科目的映射模式（ML 训练数据）
CREATE TABLE IF NOT EXISTS vendor_category_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 供应商信息
  vendor_name TEXT NOT NULL,
  standardized_vendor TEXT,            -- 标准化后的名称
  vendor_type TEXT,                    -- 'gas_station', 'grocery', 'hardware'
  
  -- 建议的会计科目
  suggested_category_id UUID REFERENCES accounting_categories(id),
  confidence DECIMAL(3,2),
  
  -- 训练数据
  sample_count INTEGER DEFAULT 1,      -- 样本数量
  user_agreement_rate DECIMAL(3,2),    -- 用户同意率
  
  -- 组织级别（不同行业可能不同）
  organization_id UUID REFERENCES organizations(id),
  industry_tag TEXT,
  
  -- 更新时间
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束
  UNIQUE(vendor_name, organization_id)
);

-- 5. 会计报表配置（导出模板）
CREATE TABLE IF NOT EXISTS accounting_report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- 报表信息
  report_name TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN (
    'tax_summary',       -- 报税汇总
    'expense_by_category', -- 按科目分类
    'expense_by_tag',    -- 按标签分类
    'dual_view'          -- 双轨视图
  )),
  
  -- 配置
  included_categories UUID[],          -- 包含的科目
  included_tags UUID[],                -- 包含的标签
  date_range_type TEXT,                -- 'fiscal_year', 'calendar_year', 'custom'
  
  -- 格式
  output_format TEXT DEFAULT 'pdf' CHECK (output_format IN (
    'pdf', 'excel', 'csv', 'json'
  )),
  
  -- 是否默认
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 索引优化
-- ============================================

-- 会计科目查询
CREATE INDEX idx_categories_code ON accounting_categories(code);
CREATE INDEX idx_categories_industry ON accounting_categories USING GIN(industry_tags);
CREATE INDEX idx_categories_active ON accounting_categories(is_active, display_order);

-- 映射关系查询
CREATE INDEX idx_mappings_tag ON tag_category_mappings(tag_id);
CREATE INDEX idx_mappings_category ON tag_category_mappings(category_id);
CREATE INDEX idx_mappings_org ON tag_category_mappings(organization_id, confidence DESC);

-- 收据科目查询
CREATE INDEX idx_transaction_categories_transaction ON transaction_categories(transaction_id);
CREATE INDEX idx_transaction_categories_category ON transaction_categories(category_id);
CREATE INDEX idx_transaction_categories_source ON transaction_categories(assignment_source);

-- 供应商模式查询
CREATE INDEX idx_vendor_patterns_vendor ON vendor_category_patterns(vendor_name);
CREATE INDEX idx_vendor_patterns_org ON vendor_category_patterns(organization_id, confidence DESC);

-- ============================================
-- RLS 策略
-- ============================================

-- Accounting Categories（所有用户可见）
ALTER TABLE accounting_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view categories"
  ON accounting_categories FOR SELECT
  USING (true);

-- Transaction Categories
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaction categories"
  ON transaction_categories FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Tag Category Mappings
ALTER TABLE tag_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org mappings"
  ON tag_category_mappings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 核心函数
-- ============================================

-- 1. AI 自动分配会计科目
CREATE OR REPLACE FUNCTION auto_assign_category(
  p_transaction_id UUID,
  p_vendor_name TEXT,
  p_amount_cents BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
  v_confidence DECIMAL(3,2);
  v_org_id UUID;
BEGIN
  -- 获取组织 ID
  SELECT organization_id INTO v_org_id
  FROM transactions
  WHERE id = p_transaction_id;
  
  -- 查找匹配的供应商模式
  SELECT 
    suggested_category_id,
    confidence
  INTO v_category_id, v_confidence
  FROM vendor_category_patterns
  WHERE organization_id = v_org_id
    AND (
      vendor_name ILIKE '%' || p_vendor_name || '%'
      OR standardized_vendor ILIKE '%' || p_vendor_name || '%'
    )
  ORDER BY confidence DESC, sample_count DESC
  LIMIT 1;
  
  -- 如果没有找到模式，使用默认规则
  IF v_category_id IS NULL THEN
    -- 基于供应商名称的关键词匹配
    v_category_id := match_category_by_keywords(p_vendor_name);
    v_confidence := 0.6;
  END IF;
  
  -- 如果找到了科目，自动分配
  IF v_category_id IS NOT NULL THEN
    INSERT INTO transaction_categories (
      transaction_id,
      category_id,
      assignment_source,
      confidence_score,
      user_confirmed
    ) VALUES (
      p_transaction_id,
      v_category_id,
      'ai_auto',
      v_confidence,
      false  -- 需要用户确认
    )
    ON CONFLICT (transaction_id) DO UPDATE
    SET 
      category_id = EXCLUDED.category_id,
      confidence_score = EXCLUDED.confidence_score;
  END IF;
  
  RETURN v_category_id;
END;
$$;

-- 2. 基于关键词匹配会计科目
CREATE OR REPLACE FUNCTION match_category_by_keywords(p_vendor TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- 关键词规则（简化版）
  CASE
    -- 餐饮
    WHEN p_vendor ~* 'restaurant|cafe|coffee|starbucks|tim hortons|food' THEN
      SELECT id INTO v_category_id FROM accounting_categories 
      WHERE code = 'MEALS' LIMIT 1;
    
    -- 加油
    WHEN p_vendor ~* 'shell|esso|petro|gas|fuel' THEN
      SELECT id INTO v_category_id FROM accounting_categories 
      WHERE code = 'FUEL' LIMIT 1;
    
    -- 建材
    WHEN p_vendor ~* 'home depot|lowes|lumber|rona|hardware' THEN
      SELECT id INTO v_category_id FROM accounting_categories 
      WHERE code = 'MATERIALS' LIMIT 1;
    
    -- 办公
    WHEN p_vendor ~* 'staples|office|printing' THEN
      SELECT id INTO v_category_id FROM accounting_categories 
      WHERE code = 'OFFICE' LIMIT 1;
    
    ELSE
      -- 默认：其他费用
      SELECT id INTO v_category_id FROM accounting_categories 
      WHERE code = 'OTHER' LIMIT 1;
  END CASE;
  
  RETURN v_category_id;
END;
$$;

-- 3. 用户确认会计科目（并学习）
CREATE OR REPLACE FUNCTION confirm_category(
  p_transaction_id UUID,
  p_category_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_vendor TEXT;
  v_org_id UUID;
BEGIN
  -- 获取收据信息
  SELECT vendor, organization_id
  INTO v_vendor, v_org_id
  FROM transactions
  WHERE id = p_transaction_id;
  
  -- 更新收据的会计科目
  UPDATE transaction_categories
  SET 
    category_id = p_category_id,
    user_confirmed = true,
    confirmed_at = NOW(),
    assignment_source = 'user_manual'
  WHERE transaction_id = p_transaction_id;
  
  IF NOT FOUND THEN
    -- 如果不存在，创建
    INSERT INTO transaction_categories (
      transaction_id,
      category_id,
      assignment_source,
      user_confirmed,
      confirmed_at,
      created_by
    ) VALUES (
      p_transaction_id,
      p_category_id,
      'user_manual',
      true,
      NOW(),
      p_user_id
    );
  END IF;
  
  -- 更新供应商模式（ML 学习）
  INSERT INTO vendor_category_patterns (
    vendor_name,
    suggested_category_id,
    confidence,
    sample_count,
    organization_id
  ) VALUES (
    v_vendor,
    p_category_id,
    0.7,
    1,
    v_org_id
  )
  ON CONFLICT (vendor_name, organization_id)
  DO UPDATE SET
    sample_count = vendor_category_patterns.sample_count + 1,
    confidence = LEAST(
      vendor_category_patterns.confidence + 0.05,
      0.95
    ),
    updated_at = NOW();
  
  RETURN true;
END;
$$;

-- 4. 生成双轨报表数据
CREATE OR REPLACE FUNCTION generate_dual_view_report(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  -- 标签维度
  tag_name TEXT,
  tag_total_cents BIGINT,
  
  -- 会计科目维度
  category_name TEXT,
  category_total_cents BIGINT,
  
  -- 交叉数据
  tag_category_breakdown JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH tag_totals AS (
    SELECT 
      t.name as tag_name,
      SUM(tr.amount_cents) as total_cents
    FROM transactions tr
    JOIN transaction_tags tt ON tr.id = tt.transaction_id
    JOIN tags t ON tt.tag_id = t.id
    WHERE tr.organization_id = p_org_id
      AND tr.transaction_date BETWEEN p_start_date AND p_end_date
    GROUP BY t.name
  ),
  category_totals AS (
    SELECT 
      ac.name_en as category_name,
      SUM(tr.amount_cents) as total_cents
    FROM transactions tr
    JOIN transaction_categories tc ON tr.id = tc.transaction_id
    JOIN accounting_categories ac ON tc.category_id = ac.id
    WHERE tr.organization_id = p_org_id
      AND tr.transaction_date BETWEEN p_start_date AND p_end_date
    GROUP BY ac.name_en
  )
  SELECT 
    tt.tag_name,
    tt.total_cents,
    ct.category_name,
    ct.total_cents,
    '{}'::JSONB  -- 交叉数据（简化）
  FROM tag_totals tt
  FULL OUTER JOIN category_totals ct ON true;
END;
$$;

-- 5. 导出税务汇总
CREATE OR REPLACE FUNCTION generate_tax_summary(
  p_org_id UUID,
  p_fiscal_year INTEGER
)
RETURNS TABLE (
  category_code TEXT,
  category_name TEXT,
  total_amount_cents BIGINT,
  total_amount_display TEXT,
  deductible_amount_cents BIGINT,
  deductible_amount_display TEXT,
  deduction_rate DECIMAL,
  cra_code TEXT,
  transaction_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ac.code,
    ac.name_en,
    SUM(t.amount_cents) as total_amount_cents,
    '$' || (SUM(t.amount_cents)::DECIMAL / 100)::TEXT as total_amount_display,
    SUM(
      CASE 
        WHEN ac.is_tax_deductible THEN 
          t.amount_cents * COALESCE(ac.tax_deduction_rate, 1.0)
        ELSE 0
      END
    )::BIGINT as deductible_amount_cents,
    '$' || (SUM(
      CASE 
        WHEN ac.is_tax_deductible THEN 
          t.amount_cents * COALESCE(ac.tax_deduction_rate, 1.0)
        ELSE 0
      END
    )::DECIMAL / 100)::TEXT as deductible_amount_display,
    ac.tax_deduction_rate,
    ac.cra_code,
    COUNT(t.id)::INTEGER as transaction_count
  FROM transactions t
  JOIN transaction_categories tc ON t.id = tc.transaction_id
  JOIN accounting_categories ac ON tc.category_id = ac.id
  WHERE t.organization_id = p_org_id
    AND EXTRACT(YEAR FROM t.transaction_date) = p_fiscal_year
  GROUP BY ac.code, ac.name_en, ac.tax_deduction_rate, ac.cra_code
  ORDER BY ac.code;
$$;

-- ============================================
-- 初始化标准会计科目（加拿大标准）
-- ============================================

-- 创建标准会计科目的函数
CREATE OR REPLACE FUNCTION create_standard_categories()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- 1. 餐饮和娱乐（50% 可抵扣）
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate, cra_code
  ) VALUES 
    ('MEALS', 'Meals & Entertainment', true, 0.50, '8523')
  ON CONFLICT DO NOTHING;
  
  -- 2. 汽车费用
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate, cra_code
  ) VALUES 
    ('FUEL', 'Motor Vehicle - Fuel', true, 1.00, '9281'),
    ('VEHICLE_REPAIR', 'Motor Vehicle - Repairs', true, 1.00, '9281'),
    ('VEHICLE_INSURANCE', 'Motor Vehicle - Insurance', true, 1.00, '9804')
  ON CONFLICT DO NOTHING;
  
  -- 3. 材料和用品
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate, cra_code, industry_tags
  ) VALUES 
    ('MATERIALS', 'Materials & Supplies', true, 1.00, '8060', ARRAY['construction']),
    ('SMALL_TOOLS', 'Small Tools', true, 1.00, '8810', ARRAY['construction'])
  ON CONFLICT DO NOTHING;
  
  -- 4. 办公费用
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate, cra_code
  ) VALUES 
    ('OFFICE', 'Office Supplies', true, 1.00, '8810'),
    ('POSTAGE', 'Postage & Delivery', true, 1.00, '8450')
  ON CONFLICT DO NOTHING;
  
  -- 5. 专业服务
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate, cra_code
  ) VALUES 
    ('LEGAL', 'Legal & Accounting', true, 1.00, '8862'),
    ('CONSULTING', 'Consulting Fees', true, 1.00, '8862')
  ON CONFLICT DO NOTHING;
  
  -- 6. 设备租赁
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate, cra_code, industry_tags
  ) VALUES 
    ('EQUIPMENT_RENTAL', 'Equipment Rental', true, 1.00, '8690', ARRAY['construction'])
  ON CONFLICT DO NOTHING;
  
  -- 7. 其他
  INSERT INTO accounting_categories (
    code, name_en, is_tax_deductible, tax_deduction_rate
  ) VALUES 
    ('OTHER', 'Other Expenses', true, 1.00)
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 执行初始化
SELECT create_standard_categories();

-- ============================================
-- 触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_timestamp
  BEFORE UPDATE ON accounting_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_updated_at();

CREATE TRIGGER update_mappings_timestamp
  BEFORE UPDATE ON tag_category_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_category_updated_at();
