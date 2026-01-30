-- ============================================
-- SnapLabs Global - 权限系统数据库设计
-- ============================================

-- 1. 用户资料表（扩展）
-- Note: profiles table may already exist, so we use ALTER TABLE to add columns
DO $$ 
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'user'));
  END IF;

  -- Add subscription_tier column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
    ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check CHECK (subscription_tier IN (
      'free', 'basic_ls', 'basic_jss', 'pro_ls', 'pro_jss', 'enterprise'
    ));
  END IF;

  -- Add accessible_apps column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'accessible_apps'
  ) THEN
    ALTER TABLE profiles ADD COLUMN accessible_apps TEXT[] DEFAULT ARRAY['ledgersnap']::TEXT[];
  END IF;

  -- Add subscription_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'active';
    ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check CHECK (subscription_status IN (
      'active', 'cancelled', 'expired', 'trial'
    ));
  END IF;

  -- Add subscription dates if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_start_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_end_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_end_date TIMESTAMPTZ;
  END IF;
END $$;

-- 2. 应用权限配置表
CREATE TABLE IF NOT EXISTS app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT NOT NULL UNIQUE CHECK (app_code IN (
    'ledgersnap',
    'jobsite-snap',
    'service-snap-qr'
  )),
  app_name TEXT NOT NULL,
  required_tier TEXT[] NOT NULL,  -- 需要的最低订阅等级
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 用户应用访问日志
CREATE TABLE IF NOT EXISTS app_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  app_code TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 升级请求表（追踪转化漏斗）
CREATE TABLE IF NOT EXISTS upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  app_code TEXT NOT NULL,
  
  -- 转化追踪
  request_status TEXT DEFAULT 'pending' CHECK (request_status IN (
    'pending',
    'completed',
    'abandoned',
    'declined'
  )),
  
  -- 数据预热信息（JSON）
  user_data_snapshot JSONB DEFAULT '{}',  -- 如：{"ls_receipts": 50, "ls_vendors": 12}
  
  -- 营销追踪
  referral_source TEXT,  -- 'paywall', 'dashboard', 'email', etc.
  utm_campaign TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 索引优化
-- ============================================

-- 用户权限查询优化
CREATE INDEX IF NOT EXISTS idx_profiles_accessible_apps ON profiles USING GIN (accessible_apps);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 访问日志查询优化
CREATE INDEX IF NOT EXISTS idx_access_logs_user_app ON app_access_logs(user_id, app_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON app_access_logs(created_at DESC);

-- 升级请求查询优化
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user ON upgrade_requests(user_id, request_status);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON upgrade_requests(request_status, created_at DESC);

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Profiles 策略 (only create if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Access Logs 策略
DROP POLICY IF EXISTS "Users can view own access logs" ON app_access_logs;
CREATE POLICY "Users can view own access logs"
  ON app_access_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert access logs" ON app_access_logs;
CREATE POLICY "System can insert access logs"
  ON app_access_logs FOR INSERT
  WITH CHECK (true);

-- Upgrade Requests 策略
DROP POLICY IF EXISTS "Users can view own upgrade requests" ON upgrade_requests;
CREATE POLICY "Users can view own upgrade requests"
  ON upgrade_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create upgrade requests" ON upgrade_requests;
CREATE POLICY "Users can create upgrade requests"
  ON upgrade_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 初始数据
-- ============================================

-- 插入应用权限配置
INSERT INTO app_permissions (app_code, app_name, required_tier, description) VALUES
  ('ledgersnap', 'LedgerSnap', ARRAY['basic_ls', 'pro_ls', 'enterprise'], 'Receipt and expense management'),
  ('jobsite-snap', 'JobSite Snap', ARRAY['basic_jss', 'pro_jss', 'enterprise'], 'Project time tracking and management'),
  ('service-snap-qr', 'Service Snap QR', ARRAY['enterprise'], 'Equipment service tracking')
ON CONFLICT (app_code) DO NOTHING;

-- ============================================
-- 权限检查函数
-- ============================================

-- 检查用户是否有权限访问应用
CREATE OR REPLACE FUNCTION check_app_access(
  p_user_id UUID,
  p_app_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- 检查用户是否有该应用的访问权限
  SELECT 
    p_app_code = ANY(accessible_apps)
  INTO v_has_access
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_has_access, false);
END;
$$;

-- 获取用户可访问的应用列表
CREATE OR REPLACE FUNCTION get_user_apps(p_user_id UUID)
RETURNS TABLE (
  app_code TEXT,
  app_name TEXT,
  has_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.app_code,
    ap.app_name,
    (ap.app_code = ANY(p.accessible_apps)) as has_access
  FROM app_permissions ap
  CROSS JOIN profiles p
  WHERE p.id = p_user_id
    AND ap.is_active = true;
END;
$$;

-- 记录应用访问日志
CREATE OR REPLACE FUNCTION log_app_access(
  p_user_id UUID,
  p_app_code TEXT,
  p_access_granted BOOLEAN,
  p_denial_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO app_access_logs (
    user_id,
    app_code,
    access_granted,
    denial_reason,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_app_code,
    p_access_granted,
    p_denial_reason,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 创建升级请求
CREATE OR REPLACE FUNCTION create_upgrade_request(
  p_user_id UUID,
  p_to_tier TEXT,
  p_app_code TEXT,
  p_referral_source TEXT DEFAULT NULL,
  p_user_data_snapshot JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_current_tier TEXT;
BEGIN
  -- 获取当前订阅等级
  SELECT subscription_tier INTO v_current_tier
  FROM profiles
  WHERE id = p_user_id;
  
  -- 创建升级请求
  INSERT INTO upgrade_requests (
    user_id,
    from_tier,
    to_tier,
    app_code,
    referral_source,
    user_data_snapshot
  ) VALUES (
    p_user_id,
    COALESCE(v_current_tier, 'free'),
    p_to_tier,
    p_app_code,
    p_referral_source,
    p_user_data_snapshot
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- ============================================
-- 自动更新 updated_at 触发器
-- ============================================

-- 确保 updated_at 触发器存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 数据验证触发器
-- ============================================

-- 确保 accessible_apps 与 subscription_tier 一致
CREATE OR REPLACE FUNCTION validate_app_access()
RETURNS TRIGGER AS $$
BEGIN
  -- 根据订阅等级自动设置 accessible_apps
  CASE NEW.subscription_tier
    WHEN 'free' THEN
      NEW.accessible_apps := ARRAY[]::TEXT[];
    WHEN 'basic_ls' THEN
      NEW.accessible_apps := ARRAY['ledgersnap']::TEXT[];
    WHEN 'basic_jss' THEN
      NEW.accessible_apps := ARRAY['jobsite-snap']::TEXT[];
    WHEN 'pro_ls' THEN
      NEW.accessible_apps := ARRAY['ledgersnap']::TEXT[];
    WHEN 'pro_jss' THEN
      NEW.accessible_apps := ARRAY['jobsite-snap']::TEXT[];
    WHEN 'enterprise' THEN
      NEW.accessible_apps := ARRAY['ledgersnap', 'jobsite-snap', 'service-snap-qr']::TEXT[];
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_app_access_consistency ON profiles;
CREATE TRIGGER ensure_app_access_consistency
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_app_access();
