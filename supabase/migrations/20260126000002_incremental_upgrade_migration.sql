-- ============================================================================
-- Service Snap QR - Incremental Upgrade Migration
-- ============================================================================
-- Version: 1.1
-- Date: 2026-01-27
-- Description: Add missing features to existing database
-- Author: Patrick Jiang (CTO), SnapLabs Global
--
-- 本脚本为现有数据库添加以下关键功能：
-- 1. PostGIS 地理搜索功能（最重要）
-- 2. 批量 QR 生成和激活函数
-- 3. 订阅限制自动检查
-- 4. 营销分析视图
-- 5. 性能优化索引
-- 6. 缺失的字段和约束
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: 启用 PostGIS 扩展（地理搜索核心）
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- PART 2: 添加地理位置字段
-- ============================================================================

-- Properties 表添加 PostGIS location 字段
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Companies 表添加 PostGIS location 字段
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- 从现有的 lat/lng 填充 location 字段
UPDATE properties 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

UPDATE companies 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- ============================================================================
-- PART 3: 添加缺失的重要字段
-- ============================================================================

-- Properties 表
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 为现有记录生成默认名称
UPDATE properties 
SET name = 'Property at ' || address_line1 
WHERE name IS NULL;

-- 现在设置为 NOT NULL
ALTER TABLE properties 
ALTER COLUMN name SET NOT NULL;

-- Companies 表重命名和添加字段
DO $$ 
BEGIN
    -- 重命名 name 为 company_name（如果还没改名）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'company_name'
    ) THEN
        ALTER TABLE companies RENAME COLUMN name TO company_name;
    END IF;
    
    -- 添加 specializations 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'specializations'
    ) THEN
        ALTER TABLE companies ADD COLUMN specializations TEXT[] DEFAULT '{}';
    END IF;

    -- 重命名 service_types 为 service_categories（如果需要）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'service_types'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'service_categories'
    ) THEN
        ALTER TABLE companies RENAME COLUMN service_types TO service_categories;
    END IF;

    -- 添加 contact_name 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'contact_name'
    ) THEN
        ALTER TABLE companies ADD COLUMN contact_name VARCHAR(255);
        -- 从 legal_name 或 company_name 填充
        UPDATE companies SET contact_name = COALESCE(legal_name, company_name) WHERE contact_name IS NULL;
    END IF;

    -- 统一状态字段命名
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'status'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE companies SET is_active = (status = 'active');
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'verified'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE companies RENAME COLUMN verified TO is_verified;
    END IF;
END $$;

-- Equipment Registry 表
DO $$ 
BEGIN
    -- 重命名 brand 为 manufacturer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'brand'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'manufacturer'
    ) THEN
        ALTER TABLE equipment_registry RENAME COLUMN brand TO manufacturer;
    END IF;

    -- 添加 specifications JSONB 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'specifications'
    ) THEN
        ALTER TABLE equipment_registry ADD COLUMN specifications JSONB;
    END IF;

    -- 重命名字段以保持一致性
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'registered_company_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'installer_company_id'
    ) THEN
        ALTER TABLE equipment_registry RENAME COLUMN registered_company_id TO installer_company_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'location_detail'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'location_details'
    ) THEN
        ALTER TABLE equipment_registry RENAME COLUMN location_detail TO location_details;
    END IF;

    -- 添加 current_owner_id 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'current_owner_id'
    ) THEN
        ALTER TABLE equipment_registry ADD COLUMN current_owner_id UUID REFERENCES auth.users(id);
        -- 从 property owner_id 填充
        UPDATE equipment_registry e
        SET current_owner_id = p.owner_id
        FROM properties p
        WHERE e.property_id = p.id AND e.current_owner_id IS NULL;
    END IF;

    -- 统一状态字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'status'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE equipment_registry ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE equipment_registry SET is_active = (status = 'active');
    END IF;

    -- 重命名维护字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'maintenance_interval_months'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'recommended_service_interval_months'
    ) THEN
        ALTER TABLE equipment_registry RENAME COLUMN maintenance_interval_months TO recommended_service_interval_months;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'next_maintenance_due'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'next_service_due'
    ) THEN
        ALTER TABLE equipment_registry RENAME COLUMN next_maintenance_due TO next_service_due;
    END IF;

    -- 添加 last_service_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment_registry' AND column_name = 'last_service_date'
    ) THEN
        ALTER TABLE equipment_registry ADD COLUMN last_service_date DATE;
        -- 从 service_history 获取最新服务日期
        UPDATE equipment_registry e
        SET last_service_date = (
            SELECT MAX(service_date) 
            FROM service_history 
            WHERE equipment_id = e.id
        )
        WHERE last_service_date IS NULL;
    END IF;
END $$;

-- Service History 表
DO $$ 
BEGIN
    -- 添加 photos 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_history' AND column_name = 'photos'
    ) THEN
        ALTER TABLE service_history ADD COLUMN photos TEXT[];
    END IF;

    -- 修改 total_cost 为 GENERATED ALWAYS（如果还不是）
    -- 注意：这可能需要重建列，谨慎操作
    -- 暂时跳过，保持现有逻辑
END $$;

-- ============================================================================
-- PART 4: 添加 PostGIS 地理搜索索引
-- ============================================================================

-- 地理位置 GIST 索引（最重要的性能优化）
CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON properties USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_companies_location_gist ON companies USING GIST(location);

-- ============================================================================
-- PART 5: 添加 GIN 索引（数组和 JSONB 搜索）
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_categories_gin ON companies USING GIN(service_categories);
CREATE INDEX IF NOT EXISTS idx_companies_specializations_gin ON companies USING GIN(specializations);
CREATE INDEX IF NOT EXISTS idx_equipment_specs_gin ON equipment_registry USING GIN(specifications);

-- ============================================================================
-- PART 6: 添加部分索引（提升性能）
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_equipment_active_service_due 
ON equipment_registry(next_service_due) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_companies_active 
ON companies(is_active, is_verified) 
WHERE is_active = true;

-- ============================================================================
-- PART 7: 关键函数 - 地理搜索
-- ============================================================================

-- 附近公司搜索函数（核心功能）
CREATE OR REPLACE FUNCTION get_nearby_companies(
    target_lat DECIMAL,
    target_lng DECIMAL,
    radius_km INTEGER DEFAULT 50,
    required_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    company_id UUID,
    company_name VARCHAR,
    distance_km DECIMAL,
    service_categories TEXT[],
    contact_phone VARCHAR,
    email VARCHAR,
    avg_rating DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.company_name,
        ROUND((ST_Distance(
            c.location,
            ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
        ) / 1000)::NUMERIC, 2) as distance_km,
        c.service_categories,
        c.phone,
        c.email,
        ROUND(COALESCE(AVG(r.overall_rating), 0)::NUMERIC, 2) as avg_rating
    FROM companies c
    LEFT JOIN company_ratings r ON c.id = r.company_id
    WHERE c.is_active = true
        AND c.location IS NOT NULL
        AND ST_DWithin(
            c.location,
            ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
            radius_km * 1000
        )
        AND (required_categories IS NULL OR c.service_categories && required_categories)
    GROUP BY c.id, c.company_name, c.location, c.service_categories, c.phone, c.email
    ORDER BY distance_km, avg_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_nearby_companies IS '查找指定位置附近的服务公司，按距离和评分排序';

-- ============================================================================
-- PART 8: 批量 QR 生成函数
-- ============================================================================

-- 批量生成 QR 码
CREATE OR REPLACE FUNCTION generate_qr_batch(
    batch_code_param VARCHAR,
    quantity INTEGER,
    wholesaler_name_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    batch_id UUID,
    codes_generated INTEGER
) AS $$
DECLARE
    new_batch_id UUID;
    i INTEGER;
    new_qr_code VARCHAR;
    new_short_code VARCHAR;
BEGIN
    -- 创建批次记录
    INSERT INTO qr_batches (batch_code, batch_name, quantity, wholesaler_name, status)
    VALUES (
        batch_code_param,
        wholesaler_name_param || ' - ' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
        quantity,
        wholesaler_name_param,
        'printed'
    )
    RETURNING id INTO new_batch_id;
    
    -- 生成 QR 码
    FOR i IN 1..quantity LOOP
        new_qr_code := 'HH-' || batch_code_param || '-' || LPAD(i::TEXT, 5, '0');
        new_short_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || i::TEXT) FROM 1 FOR 8));
        
        INSERT INTO pre_activation_qr_codes (
            qr_code,
            qr_code_short,
            batch_id,
            batch_sequence,
            status
        ) VALUES (
            new_qr_code,
            new_short_code,
            new_batch_id,
            i,
            'unactivated'
        );
    END LOOP;
    
    RETURN QUERY SELECT new_batch_id, quantity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_qr_batch IS '批量生成 QR 码，用于印刷贴纸';

-- QR 码激活函数
CREATE OR REPLACE FUNCTION activate_qr_code(
    qr_code_param VARCHAR,
    user_id_param UUID,
    equipment_type_param VARCHAR,
    property_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    pre_qr RECORD;
    new_equipment_id UUID;
BEGIN
    -- 获取预激活 QR 码
    SELECT * INTO pre_qr
    FROM pre_activation_qr_codes
    WHERE qr_code = qr_code_param OR qr_code_short = qr_code_param;
    
    IF pre_qr IS NULL THEN
        RAISE EXCEPTION 'QR code not found: %', qr_code_param;
    END IF;
    
    IF pre_qr.status = 'activated' THEN
        RAISE EXCEPTION 'QR code already activated';
    END IF;
    
    -- 创建设备记录
    INSERT INTO equipment_registry (
        qr_code,
        qr_code_short,
        equipment_type,
        property_id,
        current_owner_id,
        registered_by,
        privacy_level,
        status
    ) VALUES (
        pre_qr.qr_code,
        pre_qr.qr_code_short,
        equipment_type_param,
        property_id_param,
        user_id_param,
        user_id_param,
        'public',
        'active'
    ) RETURNING id INTO new_equipment_id;
    
    -- 更新预激活码状态
    UPDATE pre_activation_qr_codes
    SET 
        status = 'activated',
        activated_at = NOW(),
        activated_by = user_id_param,
        equipment_id = new_equipment_id
    WHERE id = pre_qr.id;
    
    RETURN new_equipment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_qr_code IS '激活预印刷的 QR 码并创建设备记录';

-- ============================================================================
-- PART 9: 订阅限制检查触发器
-- ============================================================================

-- 检查订阅限制函数
CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
    user_tier RECORD;
    current_equipment_count INTEGER;
    current_property_count INTEGER;
BEGIN
    -- 获取用户订阅层级
    SELECT * INTO user_tier
    FROM user_subscription_tiers
    WHERE user_id = NEW.current_owner_id 
    AND (subscription_end_date IS NULL OR subscription_end_date > CURRENT_DATE)
    AND status = 'active';
    
    -- 如果没有订阅记录，使用默认 Home Hero 限制
    IF user_tier IS NULL THEN
        user_tier.tier_name := 'home_hero';
        user_tier.max_equipment := 20;
        user_tier.max_properties := 5;
    END IF;
    
    -- 检查设备限制
    IF user_tier.max_equipment IS NOT NULL THEN
        SELECT COUNT(*) INTO current_equipment_count
        FROM equipment_registry
        WHERE current_owner_id = NEW.current_owner_id 
        AND (status = 'active' OR is_active = true);
        
        IF current_equipment_count >= user_tier.max_equipment THEN
            RAISE EXCEPTION 'Equipment limit reached (%). Upgrade to Pro for unlimited equipment.', user_tier.max_equipment;
        END IF;
    END IF;
    
    -- 检查房产限制
    IF user_tier.max_properties IS NOT NULL AND NEW.property_id IS NOT NULL THEN
        SELECT COUNT(DISTINCT property_id) INTO current_property_count
        FROM equipment_registry
        WHERE current_owner_id = NEW.current_owner_id 
        AND (status = 'active' OR is_active = true)
        AND property_id IS NOT NULL;
        
        -- 检查是否是新房产
        IF NOT EXISTS (
            SELECT 1 FROM equipment_registry 
            WHERE current_owner_id = NEW.current_owner_id 
            AND property_id = NEW.property_id 
            AND (status = 'active' OR is_active = true)
        ) THEN
            IF current_property_count >= user_tier.max_properties THEN
                RAISE EXCEPTION 'Property limit reached (%). Upgrade to Pro for unlimited properties.', user_tier.max_properties;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用订阅限制检查触发器
DROP TRIGGER IF EXISTS check_subscription_limits_trigger ON equipment_registry;
CREATE TRIGGER check_subscription_limits_trigger 
BEFORE INSERT ON equipment_registry
FOR EACH ROW 
EXECUTE FUNCTION check_subscription_limits();

-- ============================================================================
-- PART 10: 营销分析视图
-- ============================================================================

-- 批次激活统计视图
CREATE OR REPLACE VIEW batch_activation_stats AS
SELECT 
    b.id as batch_id,
    b.batch_code,
    b.batch_name,
    b.quantity,
    b.wholesaler_name,
    b.production_date,
    COUNT(p.id) as codes_generated,
    COUNT(p.id) FILTER (WHERE p.status = 'activated') as codes_activated,
    ROUND(
        (COUNT(p.id) FILTER (WHERE p.status = 'activated')::NUMERIC / 
         NULLIF(COUNT(p.id), 0) * 100), 
        2
    ) as activation_rate_percent,
    b.created_at
FROM qr_batches b
LEFT JOIN pre_activation_qr_codes p ON b.id = p.batch_id
GROUP BY b.id, b.batch_code, b.batch_name, b.quantity, 
         b.wholesaler_name, b.production_date, b.created_at;

COMMENT ON VIEW batch_activation_stats IS 'QR 批次激活统计';

-- 用户订阅概览视图
CREATE OR REPLACE VIEW user_subscription_overview AS
SELECT 
    u.id as user_id,
    u.tier_name as tier,
    u.max_equipment,
    u.max_properties,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active' OR e.is_active = true) as current_equipment_count,
    COUNT(DISTINCT e.property_id) FILTER (WHERE e.status = 'active' OR e.is_active = true) as current_property_count,
    u.subscription_end_date,
    CASE 
        WHEN u.subscription_end_date IS NULL THEN 'Active'
        WHEN u.subscription_end_date > CURRENT_DATE THEN 'Active'
        ELSE 'Expired'
    END as subscription_status
FROM user_subscription_tiers u
LEFT JOIN equipment_registry e ON u.user_id = e.current_owner_id
GROUP BY u.id, u.tier_name, u.max_equipment, u.max_properties, u.subscription_end_date;

COMMENT ON VIEW user_subscription_overview IS '用户订阅状态和使用情况概览';

-- 转化漏斗视图
CREATE OR REPLACE VIEW campaign_conversion_funnel AS
SELECT 
    b.batch_code,
    b.batch_name,
    b.wholesaler_name,
    COUNT(p.id) as total_codes,
    COUNT(p.id) FILTER (WHERE p.status = 'activated') as activated_codes,
    COUNT(DISTINCT p.activated_by) as unique_activators,
    COUNT(DISTINCT u.id) FILTER (WHERE u.tier_name IN ('pro', 'enterprise')) as upgraded_users,
    ROUND(
        (COUNT(p.id) FILTER (WHERE p.status = 'activated')::NUMERIC / 
         NULLIF(COUNT(p.id), 0) * 100), 
        2
    ) as activation_rate,
    ROUND(
        (COUNT(DISTINCT u.id) FILTER (WHERE u.tier_name IN ('pro', 'enterprise'))::NUMERIC / 
         NULLIF(COUNT(DISTINCT p.activated_by), 0) * 100), 
        2
    ) as upgrade_conversion_rate
FROM qr_batches b
LEFT JOIN pre_activation_qr_codes p ON b.id = p.batch_id
LEFT JOIN user_subscription_tiers u ON p.activated_by = u.user_id
GROUP BY b.batch_code, b.batch_name, b.wholesaler_name;

COMMENT ON VIEW campaign_conversion_funnel IS 'Home Hero 营销活动转化漏斗分析';

-- ============================================================================
-- PART 11: 更新批次激活统计的触发器
-- ============================================================================

CREATE OR REPLACE FUNCTION update_batch_activation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'activated' AND (OLD.status IS NULL OR OLD.status != 'activated') THEN
        UPDATE qr_batches
        SET 
            activated_count = activated_count + 1,
            activation_rate = ROUND(
                ((activated_count + 1)::NUMERIC / quantity * 100), 
                2
            )
        WHERE id = NEW.batch_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_batch_stats_trigger ON pre_activation_qr_codes;
CREATE TRIGGER update_batch_stats_trigger 
AFTER UPDATE OF status ON pre_activation_qr_codes
FOR EACH ROW 
EXECUTE FUNCTION update_batch_activation_stats();

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================

DO $$
DECLARE
    postgis_version TEXT;
BEGIN
    SELECT PostGIS_Version() INTO postgis_version;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INCREMENTAL UPGRADE COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PostGIS Version: %', postgis_version;
    RAISE NOTICE '';
    RAISE NOTICE 'New Features Added:';
    RAISE NOTICE '✅ PostGIS geographic search';
    RAISE NOTICE '✅ Batch QR generation function';
    RAISE NOTICE '✅ QR activation function';
    RAISE NOTICE '✅ Subscription limit checking';
    RAISE NOTICE '✅ Marketing analytics views';
    RAISE NOTICE '✅ Performance indexes (GIN, GIST)';
    RAISE NOTICE '';
    RAISE NOTICE 'Database Enhancements:';
    RAISE NOTICE '✅ Properties: location field added';
    RAISE NOTICE '✅ Companies: location field added';
    RAISE NOTICE '✅ Equipment: specifications JSONB added';
    RAISE NOTICE '✅ Field naming standardized';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to test key features:';
    RAISE NOTICE '1. Test: SELECT * FROM get_nearby_companies(49.2827, -123.1207, 10);';
    RAISE NOTICE '2. Test: SELECT * FROM generate_qr_batch(''TEST-001'', 10, ''Test Batch'');';
    RAISE NOTICE '3. Test: SELECT * FROM batch_activation_stats;';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION TASKS (手动执行)
-- ============================================================================

-- 1. 更新现有记录的地理位置
-- UPDATE properties SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL;
-- UPDATE companies SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL;

-- 2. 测试地理搜索（温哥华市中心）
-- SELECT * FROM get_nearby_companies(49.2827, -123.1207, 50);

-- 3. 测试批量生成 QR
-- SELECT * FROM generate_qr_batch('EMCO-001', 100, 'Emco Vancouver');

-- 4. 查看激活统计
-- SELECT * FROM batch_activation_stats;
-- SELECT * FROM user_subscription_overview;
-- SELECT * FROM campaign_conversion_funnel;
