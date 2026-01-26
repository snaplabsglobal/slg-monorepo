-- ============================================
-- Service Snap QR Feature - Database Migration
-- Feature: Digital Equipment Identity System
-- Created: 2026-01-26
-- Author: CTO Patrick (via Claude)
-- ============================================

-- ============================================
-- 1. PROPERTIES TABLE (房产信息表)
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 房产地址
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) DEFAULT 'Vancouver',
  province VARCHAR(50) DEFAULT 'BC',
  postal_code VARCHAR(10),
  country VARCHAR(50) DEFAULT 'Canada',
  
  -- 地理位置（用于附近师傅搜索）
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- 房产类型
  property_type VARCHAR(50), -- 'single_family', 'townhouse', 'condo', 'commercial'
  year_built INTEGER,
  square_footage INTEGER,
  
  -- 所有者信息
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name VARCHAR(255),
  owner_phone VARCHAR(20),
  owner_email VARCHAR(255),
  
  -- 元数据
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. COMPANIES TABLE (公司信息表)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 公司基本信息
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  business_number VARCHAR(50), -- BC 商业注册号
  
  -- 联系信息
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- 地址
  address_line1 VARCHAR(255),
  city VARCHAR(100) DEFAULT 'Vancouver',
  province VARCHAR(50) DEFAULT 'BC',
  postal_code VARCHAR(10),
  
  -- 地理位置（用于附近搜索）
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- 服务范围
  service_radius_km INTEGER DEFAULT 50, -- 服务半径（公里）
  service_types TEXT[], -- ['boiler', 'water_heater', 'hvac']
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  verified BOOLEAN DEFAULT false,
  
  -- 品牌设置（用于 QR Code）
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#0066CC', -- 建筑蓝
  secondary_color VARCHAR(7) DEFAULT '#FF9500', -- 活力橙
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. EQUIPMENT REGISTRY (设备注册表) - 核心表
-- ============================================
CREATE TABLE IF NOT EXISTS equipment_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- QR Code 唯一标识
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  qr_code_short VARCHAR(10) UNIQUE, -- 短码（8位字母数字，方便手动输入）
  qr_image_url TEXT, -- 生成的 QR Code 图片 URL
  
  -- 设备基本信息
  equipment_type VARCHAR(50) NOT NULL, -- 'boiler', 'water_heater', 'furnace', 'hvac', 'heat_pump'
  brand VARCHAR(100), -- 'Viessmann', 'Navien', 'Lennox', 'Carrier'
  model VARCHAR(100),
  serial_number VARCHAR(100),
  manufacture_date DATE,
  installation_date DATE,
  
  -- 技术规格
  capacity VARCHAR(50), -- '200,000 BTU', '50 Gallon'
  fuel_type VARCHAR(50), -- 'natural_gas', 'electric', 'oil', 'propane'
  efficiency_rating VARCHAR(50), -- 'AFUE 95%', 'Energy Star'
  
  -- 位置信息
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  location_detail TEXT, -- "地下室左侧墙边，靠近水表"
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'retired', 'replaced', 'pending'
  condition VARCHAR(20) DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'
  warranty_expiry_date DATE,
  
  -- 首次注册信息
  registered_by UUID REFERENCES auth.users(id),
  registered_company_id UUID REFERENCES companies(id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 隐私设置
  privacy_level VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'authorized'
  access_code VARCHAR(6), -- 6位访问码，用于授权查看
  
  -- 维护周期
  maintenance_interval_months INTEGER DEFAULT 12, -- 推荐维护间隔
  next_maintenance_due DATE,
  
  -- 附件
  manual_url TEXT, -- 用户手册链接
  photos TEXT[], -- 设备照片 URLs
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 约束
  CONSTRAINT valid_equipment_type CHECK (
    equipment_type IN ('boiler', 'water_heater', 'furnace', 'hvac', 'heat_pump', 'other')
  ),
  CONSTRAINT valid_privacy_level CHECK (
    privacy_level IN ('public', 'private', 'authorized')
  )
);

-- ============================================
-- 4. SERVICE HISTORY (服务记录表)
-- ============================================
CREATE TABLE IF NOT EXISTS service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联设备
  equipment_id UUID REFERENCES equipment_registry(id) ON DELETE CASCADE,
  
  -- 关联订单（如果是通过 JSS 系统）
  service_order_id UUID, -- 关联到未来的 service_orders 表
  
  -- 服务信息
  service_type VARCHAR(50) NOT NULL, -- 'maintenance', 'repair', 'inspection', 'installation', 'replacement'
  service_date DATE NOT NULL,
  service_time TIME,
  duration_hours DECIMAL(5,2),
  
  -- 服务详情
  title VARCHAR(255), -- "年度维护", "紧急维修"
  description TEXT,
  issues_found TEXT[], -- ['循环泵噪音', '压力过高']
  actions_taken TEXT[], -- ['更换循环泵', '调整压力']
  
  -- 更换部件
  parts_replaced JSONB DEFAULT '[]', 
  -- 格式: [{"part": "循环泵", "part_number": "ABC123", "quantity": 1, "cost": 250.00}]
  
  -- 费用
  labor_hours DECIMAL(5,2),
  labor_rate DECIMAL(10,2),
  parts_total DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  
  -- 服务提供者
  technician_id UUID REFERENCES auth.users(id),
  technician_name VARCHAR(255), -- 冗余，防止用户删除
  company_id UUID REFERENCES companies(id),
  company_name VARCHAR(255), -- 冗余
  
  -- 下次维护预测
  next_service_due DATE,
  next_service_type VARCHAR(50),
  next_service_notes TEXT,
  
  -- 设备状态评估
  condition_after VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor'
  warranty_work BOOLEAN DEFAULT false,
  
  -- 照片和文档
  photos TEXT[], -- 服务前后照片
  documents TEXT[], -- 发票、保修单、检测报告
  
  -- 客户签名
  customer_signature TEXT, -- Base64 签名图片
  customer_name VARCHAR(255),
  customer_signed_at TIMESTAMPTZ,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. QR SCAN LOGS (QR 扫描日志表)
-- ============================================
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 扫描信息
  equipment_id UUID REFERENCES equipment_registry(id) ON DELETE CASCADE,
  qr_code VARCHAR(255) NOT NULL,
  
  -- 扫描者信息
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL 如果未登录
  is_authenticated BOOLEAN DEFAULT false,
  
  -- 设备信息
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  os VARCHAR(50), -- 'iOS', 'Android', 'Windows'
  browser VARCHAR(50), -- 'Safari', 'Chrome'
  
  -- 地理位置
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  city VARCHAR(100),
  country VARCHAR(50),
  
  -- 扫描结果
  action_taken VARCHAR(50), -- 'view', 'request_service', 'download_manual', 'call_company'
  time_spent_seconds INTEGER, -- 在页面停留时间
  
  -- Referrer
  referrer TEXT,
  
  -- 时间戳
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SERVICE REQUESTS (服务请求表)
-- ============================================
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联设备和房产
  equipment_id UUID REFERENCES equipment_registry(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- 请求信息
  request_type VARCHAR(50), -- 'maintenance', 'repair', 'emergency', 'quote', 'inspection'
  urgency VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'emergency'
  
  -- 问题描述
  title VARCHAR(255),
  description TEXT,
  symptoms TEXT[], -- ['漏水', '噪音大', '不加热']
  
  -- 时间偏好
  preferred_date DATE,
  preferred_time_slot VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'anytime'
  flexible_schedule BOOLEAN DEFAULT false,
  
  -- 请求者信息
  requester_id UUID REFERENCES auth.users(id),
  requester_name VARCHAR(255),
  requester_phone VARCHAR(20),
  requester_email VARCHAR(255),
  contact_preference VARCHAR(20) DEFAULT 'phone', -- 'phone', 'email', 'sms'
  
  -- 智能路由信息
  original_company_id UUID REFERENCES companies(id), -- 设备注册时的原公司
  assigned_company_id UUID REFERENCES companies(id), -- 实际分配的公司
  assigned_technician_id UUID REFERENCES auth.users(id),
  
  routing_reason VARCHAR(50), -- 'original', 'unavailable', 'closed', 'recommended'
  routing_algorithm VARCHAR(50) DEFAULT 'proximity', -- 'proximity', 'rating', 'availability'
  
  -- 状态跟踪
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'assigned', 'scheduled', 'in_progress', 'completed', 'cancelled'
  status_history JSONB DEFAULT '[]',
  -- 格式: [{"status": "assigned", "timestamp": "2026-01-26T10:00:00Z", "note": "Assigned to Tech A"}]
  
  -- 报价（如果适用）
  estimated_cost DECIMAL(10,2),
  quote_provided_at TIMESTAMPTZ,
  quote_accepted BOOLEAN,
  
  -- 完成信息
  completed_at TIMESTAMPTZ,
  actual_cost DECIMAL(10,2),
  completion_notes TEXT,
  
  -- 取消信息
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  
  -- 照片
  photos TEXT[], -- 问题照片
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. COMPANY RATINGS (公司评分表)
-- ============================================
CREATE TABLE IF NOT EXISTS company_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  service_order_id UUID, -- 关联到具体服务订单
  service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment_registry(id),
  
  -- 评分（1-5星）
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- 分项评分
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- 评价内容
  review_title VARCHAR(255),
  review_text TEXT,
  pros TEXT[], -- ['专业', '准时', '价格合理']
  cons TEXT[], -- ['停车不便']
  
  -- 评价者
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_name VARCHAR(255),
  reviewer_verified BOOLEAN DEFAULT false, -- 是否验证过服务确实完成
  
  -- 回应
  company_response TEXT,
  company_responded_at TIMESTAMPTZ,
  
  -- 照片
  photos TEXT[],
  
  -- 推荐
  would_recommend BOOLEAN,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published', -- 'published', 'flagged', 'hidden'
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. QR GENERATION CONFIG (QR 生成配置表)
-- ============================================
CREATE TABLE IF NOT EXISTS qr_generation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 公司配置（NULL = 系统默认配置）
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 模板配置
  template_name VARCHAR(100) DEFAULT 'default', -- 'default', 'premium', 'minimal', 'custom'
  is_active BOOLEAN DEFAULT true,
  
  -- 品牌元素
  show_company_logo BOOLEAN DEFAULT true,
  logo_url TEXT,
  logo_position VARCHAR(20) DEFAULT 'top', -- 'top', 'bottom', 'left', 'right'
  
  -- 颜色配置
  primary_color VARCHAR(7) DEFAULT '#0066CC', -- 建筑蓝
  secondary_color VARCHAR(7) DEFAULT '#FF9500', -- 活力橙
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#000000',
  
  -- QR Code 样式
  qr_style VARCHAR(20) DEFAULT 'square', -- 'square', 'rounded', 'dot'
  qr_error_correction VARCHAR(1) DEFAULT 'M', -- 'L', 'M', 'Q', 'H'
  
  -- 内容配置
  show_company_name BOOLEAN DEFAULT true,
  show_contact_info BOOLEAN DEFAULT true,
  show_equipment_type BOOLEAN DEFAULT true,
  show_warranty_info BOOLEAN DEFAULT false,
  show_qr_short_code BOOLEAN DEFAULT true,
  
  -- 标签文案
  title_text VARCHAR(100) DEFAULT 'Equipment Service Record',
  subtitle_text VARCHAR(255),
  call_to_action VARCHAR(100) DEFAULT 'Scan for Service History',
  
  -- 打印规格
  sticker_size VARCHAR(20) DEFAULT '3x3', -- '2x2', '3x3', '4x4' (inches)
  sticker_shape VARCHAR(20) DEFAULT 'square', -- 'square', 'circle', 'rounded'
  sticker_material VARCHAR(50) DEFAULT 'vinyl', -- 'vinyl', 'polyester', 'metallic', 'high_temp'
  
  -- 高级设置
  include_nfc BOOLEAN DEFAULT false, -- 是否包含 NFC 芯片
  weatherproof BOOLEAN DEFAULT true,
  temperature_resistant BOOLEAN DEFAULT true,
  max_temperature_celsius INTEGER DEFAULT 150,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES - 性能优化
-- ============================================

-- Equipment Registry 索引
CREATE INDEX IF NOT EXISTS idx_equipment_qr_code ON equipment_registry(qr_code);
CREATE INDEX IF NOT EXISTS idx_equipment_qr_short ON equipment_registry(qr_code_short);
CREATE INDEX IF NOT EXISTS idx_equipment_property ON equipment_registry(property_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment_registry(registered_company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment_registry(status);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment_registry(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance ON equipment_registry(next_maintenance_due) WHERE status = 'active';

-- Service History 索引
CREATE INDEX IF NOT EXISTS idx_service_equipment ON service_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_service_date ON service_history(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_company ON service_history(company_id);
CREATE INDEX IF NOT EXISTS idx_service_technician ON service_history(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_type ON service_history(service_type);

-- Properties 索引
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(city, province);

-- Companies 索引
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_companies_verified ON companies(verified) WHERE verified = true;

-- Service Requests 索引
CREATE INDEX IF NOT EXISTS idx_request_equipment ON service_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_request_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_assigned_company ON service_requests(assigned_company_id);
CREATE INDEX IF NOT EXISTS idx_request_requester ON service_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_request_date ON service_requests(created_at DESC);

-- QR Scan Logs 索引
CREATE INDEX IF NOT EXISTS idx_scan_equipment ON qr_scan_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_scan_date ON qr_scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_user ON qr_scan_logs(scanned_by) WHERE scanned_by IS NOT NULL;

-- Company Ratings 索引
CREATE INDEX IF NOT EXISTS idx_rating_company ON company_ratings(company_id);
CREATE INDEX IF NOT EXISTS idx_rating_date ON company_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rating_score ON company_ratings(overall_rating);

-- ============================================
-- TRIGGERS - 自动化
-- ============================================

-- 通用：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_timestamp
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_timestamp
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_timestamp
  BEFORE UPDATE ON equipment_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_timestamp
  BEFORE UPDATE ON service_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_timestamp
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动生成 QR Code Short Code
CREATE OR REPLACE FUNCTION generate_qr_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code_short IS NULL THEN
    -- 生成8位随机字母数字组合（去除易混淆字符：0,O,I,1）
    NEW.qr_code_short := upper(substring(md5(random()::text) from 1 for 8));
    NEW.qr_code_short := translate(NEW.qr_code_short, '01OI', 'XYZW');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_qr_short_code
  BEFORE INSERT ON equipment_registry
  FOR EACH ROW EXECUTE FUNCTION generate_qr_short_code();

-- 自动计算下次维护日期
CREATE OR REPLACE FUNCTION calculate_next_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果添加了新的服务记录，更新设备的下次维护日期
  IF NEW.service_type IN ('maintenance', 'inspection') THEN
    UPDATE equipment_registry
    SET next_maintenance_due = NEW.service_date + (maintenance_interval_months || ' months')::INTERVAL,
        updated_at = NOW()
    WHERE id = NEW.equipment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_next_maintenance
  AFTER INSERT ON service_history
  FOR EACH ROW EXECUTE FUNCTION calculate_next_maintenance();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_generation_config ENABLE ROW LEVEL SECURITY;

-- Equipment Registry RLS 策略
CREATE POLICY "Public equipment viewable by all"
  ON equipment_registry FOR SELECT
  USING (privacy_level = 'public');

CREATE POLICY "Private equipment viewable by owner and technicians"
  ON equipment_registry FOR SELECT
  USING (
    privacy_level = 'public' OR
    auth.uid() = (SELECT owner_id FROM properties WHERE id = property_id) OR
    auth.uid() = registered_by OR
    EXISTS (
      SELECT 1 FROM service_history 
      WHERE equipment_id = equipment_registry.id 
      AND technician_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can register equipment"
  ON equipment_registry FOR INSERT
  WITH CHECK (
    auth.uid() = registered_by
  );

CREATE POLICY "Technicians can update their registered equipment"
  ON equipment_registry FOR UPDATE
  USING (auth.uid() = registered_by);

-- Service History RLS 策略
CREATE POLICY "Public equipment service history viewable"
  ON service_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM equipment_registry 
      WHERE id = equipment_id 
      AND privacy_level = 'public'
    )
  );

CREATE POLICY "Technicians can add service records"
  ON service_history FOR INSERT
  WITH CHECK (auth.uid() = technician_id);

-- Service Requests RLS 策略
CREATE POLICY "Users can view own requests"
  ON service_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Assigned companies can view requests"
  ON service_requests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT registered_by FROM equipment_registry 
      WHERE registered_company_id IN (assigned_company_id, original_company_id)
      UNION
      SELECT technician_id FROM service_history
      WHERE company_id IN (assigned_company_id, original_company_id)
    )
  );

CREATE POLICY "Users can create service requests"
  ON service_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- QR Scan Logs - 记录所有扫描（无 RLS 限制，用于分析）
CREATE POLICY "Allow all scan logging"
  ON qr_scan_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own scan history"
  ON qr_scan_logs FOR SELECT
  USING (auth.uid() = scanned_by);

-- Company Ratings RLS 策略
CREATE POLICY "Published ratings viewable by all"
  ON company_ratings FOR SELECT
  USING (status = 'published');

CREATE POLICY "Users can create ratings"
  ON company_ratings FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================
-- VIEWS - 常用查询视图
-- ============================================

-- 设备完整信息视图
CREATE OR REPLACE VIEW equipment_full_view AS
SELECT 
  er.*,
  p.address_line1,
  p.city,
  p.province,
  p.owner_name,
  p.owner_phone,
  c.name AS registered_company_name,
  c.phone AS company_phone,
  c.email AS company_email,
  c.logo_url AS company_logo,
  (SELECT COUNT(*) FROM service_history sh WHERE sh.equipment_id = er.id) AS service_count,
  (SELECT MAX(service_date) FROM service_history sh WHERE sh.equipment_id = er.id) AS last_service_date,
  (SELECT AVG(rating) FROM (
    SELECT overall_rating as rating FROM company_ratings cr 
    WHERE cr.equipment_id = er.id
  ) AS ratings) AS avg_rating
FROM equipment_registry er
LEFT JOIN properties p ON er.property_id = p.id
LEFT JOIN companies c ON er.registered_company_id = c.id;

-- 附近高分公司视图（用于智能路由）
CREATE OR REPLACE VIEW nearby_high_rated_companies AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.phone,
  c.email,
  c.latitude,
  c.longitude,
  c.service_radius_km,
  c.service_types,
  COALESCE(AVG(cr.overall_rating), 0) AS avg_rating,
  COUNT(cr.id) AS review_count,
  c.verified
FROM companies c
LEFT JOIN company_ratings cr ON c.id = cr.company_id AND cr.status = 'published'
WHERE c.status = 'active'
GROUP BY c.id, c.name, c.phone, c.email, c.latitude, c.longitude, c.service_radius_km, c.service_types, c.verified
HAVING COUNT(cr.id) = 0 OR AVG(cr.overall_rating) >= 4.0;

-- 设备维护预警视图
CREATE OR REPLACE VIEW equipment_maintenance_alerts AS
SELECT 
  er.id,
  er.qr_code,
  er.equipment_type,
  er.brand,
  er.model,
  er.next_maintenance_due,
  er.property_id,
  p.address_line1,
  p.owner_name,
  p.owner_phone,
  c.name AS registered_company_name,
  c.phone AS company_phone,
  CASE 
    WHEN er.next_maintenance_due < CURRENT_DATE THEN 'overdue'
    WHEN er.next_maintenance_due <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    ELSE 'ok'
  END AS alert_status,
  CURRENT_DATE - er.next_maintenance_due AS days_overdue
FROM equipment_registry er
LEFT JOIN properties p ON er.property_id = p.id
LEFT JOIN companies c ON er.registered_company_id = c.id
WHERE er.status = 'active'
  AND er.next_maintenance_due IS NOT NULL
ORDER BY er.next_maintenance_due ASC;

-- ============================================
-- SAMPLE DATA (可选 - 用于测试)
-- ============================================

-- 创建示例公司
INSERT INTO companies (id, name, phone, email, city, latitude, longitude, service_types, verified)
VALUES 
  (gen_random_uuid(), 'Vancouver HVAC Pro', '604-123-4567', 'info@vanhvac.com', 'Vancouver', 49.2827, -123.1207, ARRAY['boiler', 'furnace', 'hvac'], true),
  (gen_random_uuid(), 'BC Heating Solutions', '604-234-5678', 'contact@bcheating.com', 'Burnaby', 49.2488, -122.9805, ARRAY['boiler', 'water_heater'], true)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS - 文档说明
-- ============================================

COMMENT ON TABLE equipment_registry IS 'Service Snap QR 核心表：存储所有注册设备的信息和 QR Code';
COMMENT ON TABLE service_history IS '设备完整服务历史记录，用于生成"病历本"';
COMMENT ON TABLE service_requests IS '从 QR Code 页面发起的服务请求，支持智能路由';
COMMENT ON TABLE qr_scan_logs IS 'QR Code 扫描日志，用于分析用户行为和市场数据';
COMMENT ON TABLE company_ratings IS '公司评分系统，用于智能推荐';

COMMENT ON COLUMN equipment_registry.qr_code IS '唯一 QR Code 标识符，格式：SSQ-{UUID前8位}-{随机4位}';
COMMENT ON COLUMN equipment_registry.privacy_level IS 'public=任何人可查看，private=仅所有者，authorized=需要访问码';
COMMENT ON COLUMN service_history.parts_replaced IS 'JSONB 格式存储更换的部件详情';
COMMENT ON COLUMN qr_scan_logs.action_taken IS '用户扫码后的行为，用于转化率分析';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- 验证表创建
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'properties',
      'companies',
      'equipment_registry',
      'service_history',
      'qr_scan_logs',
      'service_requests',
      'company_ratings',
      'qr_generation_config'
    );
  
  IF table_count = 8 THEN
    RAISE NOTICE '✅ Service Snap QR Migration Completed Successfully!';
    RAISE NOTICE '📊 Created % tables', table_count;
  ELSE
    RAISE WARNING '⚠️ Expected 8 tables, but created %', table_count;
  END IF;
END $$;
