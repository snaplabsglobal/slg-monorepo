-- ============================================
-- Home Hero Free Sticker Campaign - Database Extension
-- Feature: Batch QR Code Pre-activation System
-- Created: 2026-01-26
-- Author: CTO Patrick (via Claude)
-- ============================================

-- ============================================
-- 1. QR BATCH (QR 批次表) - 新增
-- ============================================
CREATE TABLE IF NOT EXISTS qr_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 批次信息
  batch_code VARCHAR(50) UNIQUE NOT NULL, -- 'HH-2026-01-EMCO'
  batch_name VARCHAR(255), -- 'Emco Vancouver - January 2026'
  
  -- 生产信息
  quantity INTEGER NOT NULL, -- 印刷数量，如 10000
  production_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE, -- 可选：贴纸有效期
  
  -- 分发渠道
  distribution_channel VARCHAR(50), -- 'wholesaler', 'event', 'direct_mail'
  wholesaler_name VARCHAR(255), -- 'Emco Vancouver', 'Andrew Sheret Burnaby'
  wholesaler_contact JSONB, -- {name, phone, email}
  
  -- 成本追踪
  cost_per_unit DECIMAL(6,2), -- 单张成本 $0.05
  total_cost DECIMAL(10,2), -- 总成本 $500
  
  -- 激活统计（通过触发器自动更新）
  activated_count INTEGER DEFAULT 0,
  activation_rate DECIMAL(5,2) DEFAULT 0.00, -- 激活率 %
  
  -- 状态
  status VARCHAR(20) DEFAULT 'printed', -- 'printed', 'distributed', 'active', 'expired'
  
  -- 元数据
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PRE_ACTIVATION_QR_CODES (预激活 QR 码表) - 新增
-- ============================================
CREATE TABLE IF NOT EXISTS pre_activation_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- QR Code 信息
  qr_code VARCHAR(255) UNIQUE NOT NULL, -- 'HH-ABC12345'
  qr_code_short VARCHAR(10) UNIQUE NOT NULL, -- '4F8G2K9M' (8位)
  qr_image_url TEXT, -- 生成的 QR Code 图片
  
  -- 批次关联
  batch_id UUID REFERENCES qr_batches(id) ON DELETE CASCADE,
  batch_sequence INTEGER, -- 批次内序号 (1-10000)
  
  -- 激活状态
  status VARCHAR(20) DEFAULT 'unactivated', -- 'unactivated', 'activated', 'expired'
  
  -- 激活信息（激活后填充）
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id), -- 激活的师傅
  equipment_id UUID REFERENCES equipment_registry(id), -- 绑定的设备
  
  -- 安全签名（防伪）
  signature VARCHAR(255), -- HMAC-SHA256 签名
  verification_token VARCHAR(100), -- 一次性验证令牌
  
  -- 扫描追踪
  first_scan_at TIMESTAMPTZ,
  scan_count INTEGER DEFAULT 0,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 约束
  CONSTRAINT valid_status CHECK (status IN ('unactivated', 'activated', 'expired'))
);

-- ============================================
-- 3. USER_SUBSCRIPTION_TIERS (用户订阅层级表) - 新增
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用户关联
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- 订阅层级
  tier_name VARCHAR(50) DEFAULT 'home_hero', -- 'home_hero', 'pro', 'enterprise'
  tier_display_name VARCHAR(100) DEFAULT 'Home Hero (Free)',
  
  -- 功能限制
  max_equipment INTEGER DEFAULT 20, -- Home Hero: 20台，Pro: 无限
  max_properties INTEGER DEFAULT 5, -- Home Hero: 5个，Pro: 无限
  max_service_history INTEGER DEFAULT 100, -- Home Hero: 100条，Pro: 无限
  
  -- 功能开关
  features_enabled TEXT[] DEFAULT ARRAY[
    'basic_equipment_registry',
    'qr_code_generation',
    'service_reminders',
    'basic_reports'
  ], 
  -- Pro features: 'advanced_analytics', 'financial_reports', 'api_access', 'white_label'
  
  -- 订阅状态
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'trial', 'suspended', 'cancelled'
  trial_ends_at TIMESTAMPTZ,
  
  -- 付费信息
  is_paid BOOLEAN DEFAULT false,
  subscription_start_date DATE,
  subscription_end_date DATE,
  billing_cycle VARCHAR(20), -- 'monthly', 'yearly'
  mrr DECIMAL(10,2), -- Monthly Recurring Revenue
  
  -- 升级追踪
  upgrade_prompted_at TIMESTAMPTZ, -- 最后一次提示升级时间
  upgrade_prompt_count INTEGER DEFAULT 0,
  
  -- 激活来源（用于追踪贴纸引流效果）
  activation_source VARCHAR(50), -- 'qr_sticker', 'referral', 'organic', 'ad'
  activation_batch_id UUID REFERENCES qr_batches(id),
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 扩展 equipment_registry 表
-- ============================================

-- 添加激活来源字段
ALTER TABLE equipment_registry
ADD COLUMN IF NOT EXISTS activation_source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS pre_activation_qr_id UUID REFERENCES pre_activation_qr_codes(id),
ADD COLUMN IF NOT EXISTS claimed_via_sticker BOOLEAN DEFAULT false;

COMMENT ON COLUMN equipment_registry.activation_source IS '激活来源: manual, qr_sticker, import, api';
COMMENT ON COLUMN equipment_registry.claimed_via_sticker IS '是否通过免费贴纸激活';

-- ============================================
-- 5. 扩展 companies 表（批发商合作伙伴）
-- ============================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_wholesaler BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partnership_type VARCHAR(50), -- 'sticker_distribution', 'preferred_supplier'
ADD COLUMN IF NOT EXISTS partnership_start_date DATE,
ADD COLUMN IF NOT EXISTS sticker_batches_distributed INTEGER DEFAULT 0;

COMMENT ON COLUMN companies.is_wholesaler IS '是否为批发商合作伙伴（Emco, Andrew Sheret）';

-- ============================================
-- INDEXES - 性能优化
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pre_qr_code ON pre_activation_qr_codes(qr_code);
CREATE INDEX IF NOT EXISTS idx_pre_qr_short ON pre_activation_qr_codes(qr_code_short);
CREATE INDEX IF NOT EXISTS idx_pre_qr_batch ON pre_activation_qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_pre_qr_status ON pre_activation_qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_pre_qr_activated_by ON pre_activation_qr_codes(activated_by);

CREATE INDEX IF NOT EXISTS idx_batch_code ON qr_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_batch_status ON qr_batches(status);

CREATE INDEX IF NOT EXISTS idx_subscription_user ON user_subscription_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_tier ON user_subscription_tiers(tier_name);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON user_subscription_tiers(status);

CREATE INDEX IF NOT EXISTS idx_equipment_activation ON equipment_registry(activation_source);
CREATE INDEX IF NOT EXISTS idx_equipment_sticker ON equipment_registry(claimed_via_sticker) WHERE claimed_via_sticker = true;

-- ============================================
-- TRIGGERS - 自动化逻辑
-- ============================================

-- 1. 自动更新批次激活统计
CREATE OR REPLACE FUNCTION update_batch_activation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'activated' AND (OLD.status IS NULL OR OLD.status != 'activated') THEN
    UPDATE qr_batches
    SET 
      activated_count = activated_count + 1,
      activation_rate = (activated_count + 1)::DECIMAL / quantity * 100,
      updated_at = NOW()
    WHERE id = NEW.batch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_stats
  AFTER UPDATE OF status ON pre_activation_qr_codes
  FOR EACH ROW
  WHEN (NEW.status = 'activated')
  EXECUTE FUNCTION update_batch_activation_stats();

-- 2. 新用户自动创建 Home Hero 订阅层级
CREATE OR REPLACE FUNCTION create_default_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscription_tiers (user_id, tier_name, status)
  VALUES (NEW.id, 'home_hero', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_tier
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription_tier();

-- 3. 设备数量限制检查
CREATE OR REPLACE FUNCTION check_equipment_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_tier VARCHAR(50);
  max_allowed INTEGER;
  current_count INTEGER;
BEGIN
  -- 获取用户订阅层级
  SELECT tier_name, max_equipment INTO user_tier, max_allowed
  FROM user_subscription_tiers
  WHERE user_id = NEW.registered_by;
  
  -- 如果是 Home Hero，检查限制
  IF user_tier = 'home_hero' THEN
    SELECT COUNT(*) INTO current_count
    FROM equipment_registry
    WHERE registered_by = NEW.registered_by
      AND status = 'active';
    
    IF current_count >= max_allowed THEN
      -- 记录升级提示
      UPDATE user_subscription_tiers
      SET 
        upgrade_prompted_at = NOW(),
        upgrade_prompt_count = upgrade_prompt_count + 1
      WHERE user_id = NEW.registered_by;
      
      RAISE EXCEPTION 'Equipment limit reached. Please upgrade to Pro to manage more equipment. Current limit: %, Used: %', max_allowed, current_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_equipment_limit
  BEFORE INSERT ON equipment_registry
  FOR EACH ROW
  EXECUTE FUNCTION check_equipment_limit();

-- 4. QR Code 签名生成（防伪）
CREATE OR REPLACE FUNCTION generate_qr_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- 使用 HMAC-SHA256 生成签名
  -- 实际生产中应该使用更安全的密钥管理
  NEW.signature := encode(
    hmac(
      NEW.qr_code || NEW.batch_id::text || NEW.created_at::text,
      'your-secret-key-here', -- 实际应该从环境变量读取
      'sha256'
    ),
    'hex'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_signature
  BEFORE INSERT ON pre_activation_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION generate_qr_signature();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE qr_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_activation_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscription_tiers ENABLE ROW LEVEL SECURITY;

-- QR Batches - 只有管理员可查看
CREATE POLICY "Admins can view batches"
  ON qr_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Pre-activation QR Codes - 任何人可扫描（验证签名）
CREATE POLICY "Anyone can scan QR codes"
  ON pre_activation_qr_codes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can activate QR codes"
  ON pre_activation_qr_codes FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'unactivated');

-- User Subscription Tiers - 用户只能查看自己的
CREATE POLICY "Users can view own subscription"
  ON user_subscription_tiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscription_tiers FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- VIEWS - 常用查询
-- ============================================

-- 批次效果分析视图
CREATE OR REPLACE VIEW batch_performance_view AS
SELECT 
  b.batch_code,
  b.batch_name,
  b.wholesaler_name,
  b.quantity,
  b.activated_count,
  b.activation_rate,
  b.cost_per_unit,
  b.total_cost,
  CASE 
    WHEN b.activated_count > 0 
    THEN b.total_cost / b.activated_count 
    ELSE 0 
  END AS cac, -- Customer Acquisition Cost
  COUNT(DISTINCT pq.activated_by) AS unique_activators,
  b.status,
  b.production_date,
  CURRENT_DATE - b.production_date AS days_since_production
FROM qr_batches b
LEFT JOIN pre_activation_qr_codes pq ON b.id = pq.batch_id
GROUP BY b.id, b.batch_code, b.batch_name, b.wholesaler_name, b.quantity, 
         b.activated_count, b.activation_rate, b.cost_per_unit, b.total_cost, b.status, b.production_date;

-- Home Hero 转化漏斗视图
CREATE OR REPLACE VIEW home_hero_funnel AS
SELECT 
  'Total QR Codes Printed' AS stage,
  COUNT(*) AS count,
  100.00 AS percentage
FROM pre_activation_qr_codes
UNION ALL
SELECT 
  'First Scan' AS stage,
  COUNT(*) AS count,
  (COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM pre_activation_qr_codes) * 100) AS percentage
FROM pre_activation_qr_codes
WHERE first_scan_at IS NOT NULL
UNION ALL
SELECT 
  'Activated' AS stage,
  COUNT(*) AS count,
  (COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM pre_activation_qr_codes) * 100) AS percentage
FROM pre_activation_qr_codes
WHERE status = 'activated'
UNION ALL
SELECT 
  'Equipment Registered' AS stage,
  COUNT(*) AS count,
  (COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM pre_activation_qr_codes) * 100) AS percentage
FROM pre_activation_qr_codes pq
INNER JOIN equipment_registry er ON pq.equipment_id = er.id
UNION ALL
SELECT 
  'Upgraded to Pro' AS stage,
  COUNT(*) AS count,
  (COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM pre_activation_qr_codes WHERE status = 'activated') * 100) AS percentage
FROM user_subscription_tiers
WHERE tier_name = 'pro'
  AND activation_source = 'qr_sticker';

-- 用户升级潜力视图（接近限制的 Home Hero 用户）
CREATE OR REPLACE VIEW upgrade_prospects AS
SELECT 
  u.id AS user_id,
  u.email,
  u.raw_user_meta_data->>'name' AS user_name,
  ust.tier_name,
  ust.max_equipment,
  COUNT(er.id) AS equipment_count,
  ust.max_equipment - COUNT(er.id) AS remaining_slots,
  CASE 
    WHEN COUNT(er.id)::DECIMAL / ust.max_equipment >= 0.8 THEN 'hot'
    WHEN COUNT(er.id)::DECIMAL / ust.max_equipment >= 0.5 THEN 'warm'
    ELSE 'cold'
  END AS lead_temperature,
  ust.upgrade_prompt_count,
  ust.upgrade_prompted_at
FROM auth.users u
INNER JOIN user_subscription_tiers ust ON u.id = ust.user_id
LEFT JOIN equipment_registry er ON u.id = er.registered_by AND er.status = 'active'
WHERE ust.tier_name = 'home_hero'
  AND ust.status = 'active'
GROUP BY u.id, u.email, u.raw_user_meta_data, ust.tier_name, ust.max_equipment, 
         ust.upgrade_prompt_count, ust.upgrade_prompted_at
HAVING COUNT(er.id) >= ust.max_equipment * 0.5 -- 至少用了 50% 配额
ORDER BY COUNT(er.id) DESC;

-- ============================================
-- FUNCTIONS - 业务逻辑
-- ============================================

-- 1. 批量生成预激活 QR Codes
CREATE OR REPLACE FUNCTION generate_pre_activation_batch(
  p_batch_code VARCHAR,
  p_quantity INTEGER,
  p_wholesaler VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_counter INTEGER := 1;
  v_qr_code VARCHAR;
  v_short_code VARCHAR;
BEGIN
  -- 创建批次
  INSERT INTO qr_batches (batch_code, batch_name, quantity, wholesaler_name)
  VALUES (
    p_batch_code,
    p_wholesaler || ' - ' || TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    p_quantity,
    p_wholesaler
  )
  RETURNING id INTO v_batch_id;
  
  -- 批量生成 QR Codes
  WHILE v_counter <= p_quantity LOOP
    -- 生成唯一 QR Code
    v_qr_code := 'HH-' || p_batch_code || '-' || LPAD(v_counter::text, 6, '0');
    
    -- 生成 8 位短码（无混淆字符）
    v_short_code := upper(substring(md5(random()::text) from 1 for 8));
    v_short_code := translate(v_short_code, '01OI', 'XYZW');
    
    -- 插入
    INSERT INTO pre_activation_qr_codes (
      qr_code,
      qr_code_short,
      batch_id,
      batch_sequence
    ) VALUES (
      v_qr_code,
      v_short_code,
      v_batch_id,
      v_counter
    );
    
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- 2. 激活 QR Code
CREATE OR REPLACE FUNCTION activate_qr_sticker(
  p_qr_code VARCHAR,
  p_user_id UUID,
  p_equipment_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_qr_id UUID;
  v_equipment_id UUID;
  v_result JSONB;
BEGIN
  -- 验证 QR Code 存在且未激活
  SELECT id INTO v_qr_id
  FROM pre_activation_qr_codes
  WHERE qr_code = p_qr_code
    AND status = 'unactivated'
  FOR UPDATE;
  
  IF v_qr_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found or already activated'
    );
  END IF;
  
  -- 创建设备记录
  INSERT INTO equipment_registry (
    qr_code,
    equipment_type,
    brand,
    model,
    serial_number,
    registered_by,
    activation_source,
    pre_activation_qr_id,
    claimed_via_sticker,
    privacy_level
  ) VALUES (
    p_qr_code,
    p_equipment_data->>'equipment_type',
    p_equipment_data->>'brand',
    p_equipment_data->>'model',
    p_equipment_data->>'serial_number',
    p_user_id,
    'qr_sticker',
    v_qr_id,
    true,
    'public' -- 默认公开，方便展示师傅联系方式
  )
  RETURNING id INTO v_equipment_id;
  
  -- 标记 QR Code 为已激活
  UPDATE pre_activation_qr_codes
  SET 
    status = 'activated',
    activated_at = NOW(),
    activated_by = p_user_id,
    equipment_id = v_equipment_id,
    updated_at = NOW()
  WHERE id = v_qr_id;
  
  -- 更新用户激活来源（如果是首次）
  UPDATE user_subscription_tiers
  SET activation_source = 'qr_sticker',
      activation_batch_id = (SELECT batch_id FROM pre_activation_qr_codes WHERE id = v_qr_id)
  WHERE user_id = p_user_id
    AND activation_source IS NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'equipment_id', v_equipment_id,
    'qr_code', p_qr_code
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA - 示例批次
-- ============================================

-- 创建示例批次
SELECT generate_pre_activation_batch(
  'EMCO-VAN-2026-01',
  100, -- 生成 100 张测试贴纸
  'Emco Vancouver'
);

SELECT generate_pre_activation_batch(
  'ASHERET-BUR-2026-01',
  100,
  'Andrew Sheret Burnaby'
);

-- ============================================
-- COMMENTS - 文档
-- ============================================

COMMENT ON TABLE qr_batches IS 'QR Code 批次管理：追踪每批贴纸的生产、分发、激活情况';
COMMENT ON TABLE pre_activation_qr_codes IS '预激活 QR Codes：批量印刷的通用贴纸，扫码后绑定设备';
COMMENT ON TABLE user_subscription_tiers IS '用户订阅层级：Home Hero (免费20台) vs Pro (无限)';

COMMENT ON COLUMN pre_activation_qr_codes.signature IS '防伪签名：HMAC-SHA256，防止竞争对手篡改';
COMMENT ON COLUMN pre_activation_qr_codes.verification_token IS '一次性验证令牌：防止重放攻击';

COMMENT ON FUNCTION generate_pre_activation_batch IS '批量生成预激活 QR Codes，用于贴纸印刷';
COMMENT ON FUNCTION activate_qr_sticker IS '激活贴纸：师傅扫码后绑定设备';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Home Hero Sticker Campaign Migration Completed!';
  RAISE NOTICE '📊 Ready for mass QR code generation and distribution';
  RAISE NOTICE '🎯 Target: Convert wholesaler foot traffic into JSS users';
END $$;
