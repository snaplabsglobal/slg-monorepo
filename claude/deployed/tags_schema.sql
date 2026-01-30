-- ============================================
-- LedgerSnap - 标签系统数据库设计
-- ============================================
-- 设计理念：
-- 1. 标签是"软连接" - 灵活、多对多关系
-- 2. 支持 AI 智能建议
-- 3. 支持机器学习进化
-- 4. 为升级到 JSS 预留数据迁移路径
-- ============================================

-- 1. 标签主表（Tag Master）
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- 标签核心字段
  name TEXT NOT NULL,                    -- '#Project-Burnaby'
  display_name TEXT,                     -- 'Burnaby Kitchen Renovation'
  color TEXT DEFAULT '#0066CC',          -- 标签颜色（建筑蓝或活力橙）
  icon TEXT,                             -- 可选图标 emoji
  
  -- 分类和层级
  category TEXT CHECK (category IN (
    'project',        -- 项目标签（为 JSS 升级准备）
    'client',         -- 客户标签
    'location',       -- 地点标签
    'expense_type',   -- 费用类型
    'tax',            -- 税务标签
    'custom'          -- 自定义
  )),
  parent_tag_id UUID REFERENCES tags(id), -- 支持层级（如：#Project > #Project-Burnaby）
  
  -- 使用统计
  usage_count INTEGER DEFAULT 0,         -- 被使用次数
  last_used_at TIMESTAMPTZ,             -- 最后使用时间
  
  -- AI 学习数据
  ai_confidence DECIMAL(3,2),           -- AI 推荐的置信度（0.00-1.00）
  ai_suggested_for TEXT[],              -- AI 建议用于哪些供应商
  
  -- 元数据
  is_system_tag BOOLEAN DEFAULT false,  -- 系统预设标签
  is_archived BOOLEAN DEFAULT false,    -- 是否归档
  metadata JSONB DEFAULT '{}',          -- 扩展数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 收据标签关联表（Many-to-Many）
CREATE TABLE IF NOT EXISTS transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  
  -- 标签来源
  source TEXT NOT NULL CHECK (source IN (
    'user_manual',      -- 用户手动添加
    'ai_suggested',     -- AI 建议（用户确认）
    'ai_auto',          -- AI 自动添加（可修改）
    'imported',         -- 批量导入
    'system'            -- 系统自动
  )),
  
  -- AI 学习反馈
  user_confirmed BOOLEAN,               -- 用户是否确认了 AI 建议
  confidence_score DECIMAL(3,2),        -- 置信度分数
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- 唯一约束：同一张收据不能重复添加相同标签
  UNIQUE(transaction_id, tag_id)
);

-- 3. 标签使用模式表（ML 训练数据）
CREATE TABLE IF NOT EXISTS tag_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- 模式识别
  vendor_name TEXT,                     -- 供应商名称
  standardized_vendor TEXT,             -- 标准化供应商名
  amount_range NUMRANGE,                -- 金额范围（如：100-500）
  
  -- 建议的标签
  suggested_tags UUID[],                -- 建议标签 ID 数组
  confidence DECIMAL(3,2),              -- 整体置信度
  
  -- 训练数据
  sample_count INTEGER DEFAULT 1,       -- 样本数量
  last_trained_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 标签模板（快速创建常用标签组合）
CREATE TABLE IF NOT EXISTS tag_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- 模板信息
  name TEXT NOT NULL,                   -- '建筑项目标准标签'
  description TEXT,
  
  -- 包含的标签
  tag_ids UUID[],                       -- 标签 ID 数组
  
  -- 使用统计
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,      -- 是否公开给其他用户
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- 索引优化
-- ============================================

-- 标签查询优化
CREATE INDEX idx_tags_org_name ON tags(organization_id, name);
CREATE INDEX idx_tags_category ON tags(category) WHERE NOT is_archived;
CREATE INDEX idx_tags_usage ON tags(usage_count DESC, last_used_at DESC);

-- 标签关联查询优化
CREATE INDEX idx_transaction_tags_transaction ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);
CREATE INDEX idx_transaction_tags_source ON transaction_tags(source);

-- 模式查询优化
CREATE INDEX idx_tag_patterns_vendor ON tag_patterns(organization_id, vendor_name);
CREATE INDEX idx_tag_patterns_confidence ON tag_patterns(confidence DESC);

-- ============================================
-- RLS 策略
-- ============================================

-- Tags 表
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization tags"
  ON tags FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tags"
  ON tags FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organization tags"
  ON tags FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Transaction Tags 表
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transaction tags"
  ON transaction_tags FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage transaction tags"
  ON transaction_tags FOR ALL
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 核心函数
-- ============================================

-- 1. 获取热门标签（最常使用的标签）
CREATE OR REPLACE FUNCTION get_popular_tags(
  p_org_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  display_name TEXT,
  color TEXT,
  usage_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id,
    name,
    display_name,
    color,
    usage_count
  FROM tags
  WHERE organization_id = p_org_id
    AND NOT is_archived
  ORDER BY usage_count DESC, last_used_at DESC
  LIMIT p_limit;
$$;

-- 2. 获取 AI 建议标签
CREATE OR REPLACE FUNCTION get_ai_suggested_tags(
  p_org_id UUID,
  p_vendor_name TEXT,
  p_amount BIGINT
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  confidence DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH matched_patterns AS (
    SELECT 
      tp.suggested_tags,
      tp.confidence
    FROM tag_patterns tp
    WHERE tp.organization_id = p_org_id
      AND (
        tp.vendor_name ILIKE '%' || p_vendor_name || '%'
        OR tp.standardized_vendor ILIKE '%' || p_vendor_name || '%'
      )
      AND (
        tp.amount_range IS NULL 
        OR p_amount <@ tp.amount_range
      )
    ORDER BY tp.confidence DESC, tp.sample_count DESC
    LIMIT 1
  )
  SELECT 
    unnest(mp.suggested_tags) as tag_id,
    t.name as tag_name,
    mp.confidence
  FROM matched_patterns mp
  CROSS JOIN LATERAL unnest(mp.suggested_tags) WITH ORDINALITY AS tag_id
  JOIN tags t ON t.id = tag_id
  WHERE NOT t.is_archived;
END;
$$;

-- 3. 添加标签到收据（带 AI 学习）
CREATE OR REPLACE FUNCTION add_tag_to_transaction(
  p_transaction_id UUID,
  p_tag_id UUID,
  p_source TEXT DEFAULT 'user_manual',
  p_user_confirmed BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_tag_transaction_id UUID;
  v_vendor_name TEXT;
  v_amount BIGINT;
  v_org_id UUID;
BEGIN
  -- 获取交易信息
  SELECT vendor, amount_cents, organization_id
  INTO v_vendor_name, v_amount, v_org_id
  FROM transactions
  WHERE id = p_transaction_id;
  
  -- 插入标签关联
  INSERT INTO transaction_tags (
    transaction_id,
    tag_id,
    source,
    user_confirmed,
    created_by
  ) VALUES (
    p_transaction_id,
    p_tag_id,
    p_source,
    p_user_confirmed,
    auth.uid()
  )
  ON CONFLICT (transaction_id, tag_id) DO UPDATE
  SET user_confirmed = EXCLUDED.user_confirmed
  RETURNING id INTO v_tag_transaction_id;
  
  -- 更新标签使用统计
  UPDATE tags
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_tag_id;
  
  -- 更新 ML 模式（如果用户确认了）
  IF p_user_confirmed THEN
    INSERT INTO tag_patterns (
      organization_id,
      vendor_name,
      suggested_tags,
      confidence,
      sample_count
    ) VALUES (
      v_org_id,
      v_vendor_name,
      ARRAY[p_tag_id],
      0.8,
      1
    )
    ON CONFLICT (organization_id, vendor_name) 
    DO UPDATE SET
      suggested_tags = array_append(
        COALESCE(tag_patterns.suggested_tags, ARRAY[]::UUID[]),
        p_tag_id
      ),
      sample_count = tag_patterns.sample_count + 1,
      updated_at = NOW();
  END IF;
  
  RETURN v_tag_transaction_id;
END;
$$;

-- 4. 批量添加标签
CREATE OR REPLACE FUNCTION add_tags_batch(
  p_transaction_id UUID,
  p_tag_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_tag_id UUID;
BEGIN
  FOREACH v_tag_id IN ARRAY p_tag_ids
  LOOP
    PERFORM add_tag_to_transaction(
      p_transaction_id,
      v_tag_id,
      'user_manual',
      true
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 5. 搜索带标签的收据
CREATE OR REPLACE FUNCTION search_transactions_by_tags(
  p_org_id UUID,
  p_tag_ids UUID[],
  p_match_all BOOLEAN DEFAULT false  -- true=AND, false=OR
)
RETURNS TABLE (
  transaction_id UUID,
  vendor TEXT,
  amount_cents BIGINT,
  transaction_date DATE,
  matched_tags TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_match_all THEN
    -- AND 逻辑：必须包含所有标签
    RETURN QUERY
    SELECT 
      t.id,
      t.vendor,
      t.amount_cents,
      t.transaction_date,
      array_agg(tags.name) as matched_tags
    FROM transactions t
    JOIN transaction_tags tt ON t.id = tt.transaction_id
    JOIN tags ON tt.tag_id = tags.id
    WHERE t.organization_id = p_org_id
      AND tt.tag_id = ANY(p_tag_ids)
    GROUP BY t.id, t.vendor, t.amount_cents, t.transaction_date
    HAVING COUNT(DISTINCT tt.tag_id) = array_length(p_tag_ids, 1);
  ELSE
    -- OR 逻辑：包含任一标签
    RETURN QUERY
    SELECT 
      t.id,
      t.vendor,
      t.amount_cents,
      t.transaction_date,
      array_agg(DISTINCT tags.name) as matched_tags
    FROM transactions t
    JOIN transaction_tags tt ON t.id = tt.transaction_id
    JOIN tags ON tt.tag_id = tags.id
    WHERE t.organization_id = p_org_id
      AND tt.tag_id = ANY(p_tag_ids)
    GROUP BY t.id, t.vendor, t.amount_cents, t.transaction_date;
  END IF;
END;
$$;

-- 6. 为升级到 JSS 准备数据迁移
CREATE OR REPLACE FUNCTION prepare_jss_migration(
  p_org_id UUID,
  p_project_tag_id UUID
)
RETURNS TABLE (
  transaction_id UUID,
  vendor TEXT,
  amount_cents BIGINT,
  transaction_date DATE,
  suggested_project_name TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    t.id,
    t.vendor,
    t.amount_cents,
    t.transaction_date,
    tags.display_name as suggested_project_name
  FROM transactions t
  JOIN transaction_tags tt ON t.id = tt.transaction_id
  JOIN tags ON tt.tag_id = tags.id
  WHERE t.organization_id = p_org_id
    AND tt.tag_id = p_project_tag_id
    AND tags.category = 'project'
  ORDER BY t.transaction_date DESC;
$$;

-- ============================================
-- 自动更新触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_tag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tags_timestamp
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_updated_at();

CREATE TRIGGER update_tag_patterns_timestamp
  BEFORE UPDATE ON tag_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_updated_at();

-- ============================================
-- 初始化系统标签
-- ============================================

-- 这些是预设的系统标签，帮助用户快速开始
INSERT INTO tags (
  organization_id, 
  name, 
  display_name, 
  color, 
  category, 
  is_system_tag
) VALUES
  -- 为每个组织创建系统标签的函数
  -- 实际使用时需要传入具体的 organization_id
ON CONFLICT DO NOTHING;

-- 创建系统标签的函数
CREATE OR REPLACE FUNCTION create_default_tags(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- 项目标签
  INSERT INTO tags (organization_id, name, display_name, color, category, is_system_tag)
  VALUES 
    (p_org_id, '#Project', 'Project Related', '#0066CC', 'project', true),
    (p_org_id, '#Material', 'Materials & Supplies', '#10B981', 'expense_type', true),
    (p_org_id, '#Labor', 'Labor Cost', '#F59E0B', 'expense_type', true),
    (p_org_id, '#Equipment', 'Equipment Rental', '#8B5CF6', 'expense_type', true),
    
    -- 税务标签
    (p_org_id, '#Tax-Deductible', 'Tax Deductible', '#EF4444', 'tax', true),
    (p_org_id, '#GST', 'GST Applicable', '#3B82F6', 'tax', true),
    (p_org_id, '#PST', 'PST Applicable', '#3B82F6', 'tax', true),
    
    -- 通用标签
    (p_org_id, '#Recurring', 'Recurring Expense', '#6B7280', 'custom', true),
    (p_org_id, '#Reimbursable', 'Reimbursable', '#EC4899', 'custom', true),
    (p_org_id, '#Urgent', 'Urgent Payment', '#DC2626', 'custom', true)
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
