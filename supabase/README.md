# SnapLabs Global (SLG) 核心数据库架构说明书 v1.0

## 1. 项目愿景
构建建筑行业首个“从图纸到交易”的闭环数据工厂。

## 2. 核心 DDL 脚本 (PostgreSQL + pgvector)

-- [模块 A]：基础骨架
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE csi_codes (
    code TEXT PRIMARY KEY, -- '09 29 00.10'
    description TEXT NOT NULL,
    level INTEGER,
    parent_code TEXT REFERENCES csi_codes(code)
);

-- [模块 B]：财务与数据工厂
CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    project_id uuid,
    vendor_name TEXT,
    total_amount numeric(12,2),
    tax_amount numeric(12,2),
    receipt_url TEXT,
    captured_at timestamptz DEFAULT now()
);

CREATE TABLE transaction_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
    csi_code TEXT REFERENCES csi_codes(code),
    item_name TEXT,
    quantity numeric(12,4),
    unit_price numeric(12,2),
    total_price numeric(12,2),
    embedding vector(768) -- 关键：用于“以物找票”的向量搜索
);

-- [模块 C]：项目与成本调节
CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    geofence geography(POLYGON, 4326), -- 关键：用于自动项目匹配
    context_factors JSONB -- 存储是否 Condo, 是否有人居住等系数
);

-- [模块 D]：估算引擎 (原子化成本)
CREATE TABLE unit_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    csi_code TEXT REFERENCES csi_codes(code),
    material_cost_net numeric(12,2),
    waste_factor numeric(4,2) DEFAULT 1.10,
    productivity_rate numeric(10,2), -- 单位/小时
    wage_rate numeric(10,2) -- 时薪
);

-- [模块 E]：2D 画图矢量存储
CREATE TABLE project_drawings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id),
    drawing_data JSONB, -- 存储线段、尺寸、标注
    thumbnail_url TEXT
);