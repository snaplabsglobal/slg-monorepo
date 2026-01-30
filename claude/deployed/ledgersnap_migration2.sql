-- ========================================
-- LedgerSnap MVP - Database Migration
-- ========================================
-- Version: 1.0
-- Date: 2026-01-27
-- Description: Complete database schema for LedgerSnap receipt management system
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Table: receipts
-- Purpose: Store receipt information and AI analysis results
-- ========================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Vendor Information
  vendor_name TEXT,
  vendor_alias TEXT, -- Short name (e.g., "Home Depot" from "Home Depot #7133")
  receipt_date DATE NOT NULL,
  currency TEXT DEFAULT 'CAD',
  
  -- Financial Amounts (ALL in CENTS - integers only)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  gst_cents INTEGER NOT NULL DEFAULT 0,
  pst_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Canadian Tax Classification
  gifi_code_suggested TEXT, -- 4-digit GIFI code (e.g., "8320")
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[], -- Array of tags for flexible categorization
  
  -- Accounting Flags
  is_meals_50_deductible BOOLEAN DEFAULT false,
  is_shareholder_loan_potential BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false, -- Flags for accountant review
  
  -- AI Recognition Data
  ocr_raw_text TEXT,
  gemini_response JSONB, -- Store full Gemini API response
  confidence_vendor_name DECIMAL(3,2), -- 0.00 to 1.00
  confidence_date DECIMAL(3,2),
  confidence_amounts DECIMAL(3,2),
  confidence_tax_split DECIMAL(3,2),
  confidence_overall DECIMAL(3,2),
  
  -- Image Storage
  image_url TEXT NOT NULL,
  image_size_bytes INTEGER,
  image_mime_type TEXT,
  
  -- Additional Information
  notes TEXT,
  is_reimbursable BOOLEAN DEFAULT false,
  is_tax_deductible BOOLEAN DEFAULT false,
  
  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft Delete
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_subtotal CHECK (subtotal_cents >= 0),
  CONSTRAINT valid_gst CHECK (gst_cents >= 0),
  CONSTRAINT valid_pst CHECK (pst_cents >= 0),
  CONSTRAINT valid_total CHECK (total_cents >= 0),
  CONSTRAINT valid_gifi_code CHECK (gifi_code_suggested IS NULL OR gifi_code_suggested ~ '^\d{4}$'),
  CONSTRAINT valid_confidence_vendor CHECK (confidence_vendor_name IS NULL OR (confidence_vendor_name >= 0 AND confidence_vendor_name <= 1)),
  CONSTRAINT valid_confidence_date CHECK (confidence_date IS NULL OR (confidence_date >= 0 AND confidence_date <= 1)),
  CONSTRAINT valid_confidence_amounts CHECK (confidence_amounts IS NULL OR (confidence_amounts >= 0 AND confidence_amounts <= 1)),
  CONSTRAINT valid_confidence_tax CHECK (confidence_tax_split IS NULL OR (confidence_tax_split >= 0 AND confidence_tax_split <= 1)),
  CONSTRAINT valid_confidence_overall CHECK (confidence_overall IS NULL OR (confidence_overall >= 0 AND confidence_overall <= 1))
);

-- Add comments for documentation
COMMENT ON TABLE receipts IS 'Stores receipt information with AI-extracted accounting data';
COMMENT ON COLUMN receipts.subtotal_cents IS 'Subtotal before taxes (in cents)';
COMMENT ON COLUMN receipts.gst_cents IS 'GST amount in cents (for ITC recovery)';
COMMENT ON COLUMN receipts.pst_cents IS 'PST amount in cents';
COMMENT ON COLUMN receipts.total_cents IS 'Total amount paid (in cents)';
COMMENT ON COLUMN receipts.gifi_code_suggested IS 'Canadian GIFI tax code (4 digits)';
COMMENT ON COLUMN receipts.is_meals_50_deductible IS 'Flag for 50% deductible meals (CRA rule)';
COMMENT ON COLUMN receipts.is_shareholder_loan_potential IS 'Flag potential personal expenses';
COMMENT ON COLUMN receipts.needs_review IS 'Requires accountant review (low confidence or anomalies)';
COMMENT ON COLUMN receipts.gemini_response IS 'Full JSON response from Gemini API for debugging';
COMMENT ON COLUMN receipts.tags IS 'Array of custom tags for flexible categorization';
COMMENT ON COLUMN receipts.deleted_at IS 'Soft delete timestamp - NULL means active';

-- ========================================
-- Table: gifi_codes
-- Purpose: Canadian GIFI tax codes reference
-- ========================================
CREATE TABLE gifi_codes (
  code TEXT PRIMARY KEY CHECK (code ~ '^\d{4}$'),
  name TEXT NOT NULL,
  description TEXT,
  category_type TEXT, -- 'expense', 'revenue', 'asset', 'liability'
  is_common BOOLEAN DEFAULT false, -- Frequently used codes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE gifi_codes IS 'Canadian GIFI (General Index of Financial Information) tax codes';

-- Insert common GIFI codes for BC construction businesses
INSERT INTO gifi_codes (code, name, description, category_type, is_common) VALUES
  -- Materials & Supplies
  ('8320', 'Purchases/Materials', 'Construction materials, supplies, and inventory', 'expense', true),
  
  -- Vehicle Expenses
  ('9281', 'Fuel Costs', 'Gas, diesel, and other vehicle fuel', 'expense', true),
  ('9282', 'Vehicle Repairs & Maintenance', 'Vehicle servicing and repairs', 'expense', true),
  ('9283', 'Vehicle Licenses & Insurance', 'Vehicle registration and insurance', 'expense', true),
  
  -- Office & Administrative
  ('8810', 'Office Supplies', 'Stationery, paper, office equipment', 'expense', true),
  ('8860', 'Advertising & Promotion', 'Marketing and advertising expenses', 'expense', false),
  ('8862', 'Professional Services', 'Legal, accounting, consulting fees', 'expense', true),
  
  -- Meals & Entertainment
  ('8523', 'Meals & Entertainment', 'Business meals (50% deductible)', 'expense', true),
  
  -- Utilities & Communications
  ('9220', 'Utilities', 'Electricity, gas, water', 'expense', true),
  ('9225', 'Telephone & Internet', 'Phone bills and internet service', 'expense', true),
  
  -- Rent & Property
  ('9200', 'Rent', 'Office or warehouse rent', 'expense', false),
  ('9180', 'Property Taxes', 'Municipal property taxes', 'expense', false),
  
  -- Insurance
  ('9804', 'Business Insurance', 'General liability insurance', 'expense', true),
  
  -- Equipment & Tools
  ('8690', 'Tools < $500', 'Small tools and equipment', 'expense', true),
  ('8670', 'Equipment Rental', 'Rental of construction equipment', 'expense', true),
  
  -- Other
  ('8760', 'Other Expenses', 'Miscellaneous business expenses', 'expense', true),
  ('9270', 'Bank Charges', 'Banking fees and service charges', 'expense', false)
ON CONFLICT DO NOTHING;

-- ========================================
-- Table: categories
-- Purpose: Store predefined and custom expense categories
-- ========================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT, -- Lucide icon name (e.g., 'utensils', 'car')
  color TEXT, -- Hex color code (e.g., '#EF4444')
  is_default BOOLEAN DEFAULT false, -- System-wide default categories
  parent_category_id UUID REFERENCES categories(id), -- For subcategories
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: user can't have duplicate category names
  UNIQUE(user_id, name)
);

COMMENT ON TABLE categories IS 'Expense categories with support for user-defined and system defaults';
COMMENT ON COLUMN categories.is_default IS 'TRUE for system-wide defaults, FALSE for user-created';
COMMENT ON COLUMN categories.parent_category_id IS 'For creating subcategories (e.g., Restaurants under Food & Dining)';

-- ========================================
-- Table: user_settings
-- Purpose: Store user preferences and settings
-- ========================================
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- General Settings
  default_currency TEXT DEFAULT 'CAD',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  monthly_report BOOLEAN DEFAULT true,
  
  -- Display Settings
  theme TEXT DEFAULT 'light', -- 'light', 'dark', 'auto'
  items_per_page INTEGER DEFAULT 20,
  default_view TEXT DEFAULT 'grid', -- 'grid', 'list', 'table'
  
  -- Privacy Settings
  share_analytics BOOLEAN DEFAULT true,
  
  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_settings IS 'User preferences and application settings';

-- ========================================
-- Table: receipt_items
-- Purpose: Store individual line items from receipts
-- ========================================
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Optional categorization at item level
  category TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0),
  CONSTRAINT valid_total_price CHECK (total_price >= 0)
);

COMMENT ON TABLE receipt_items IS 'Individual line items extracted from receipts';

-- ========================================
-- Indexes for Performance
-- ========================================

-- Receipts table indexes
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date DESC);
CREATE INDEX idx_receipts_category ON receipts(category);
CREATE INDEX idx_receipts_merchant ON receipts(merchant_name);
CREATE INDEX idx_receipts_amount ON receipts(total_amount);
CREATE INDEX idx_receipts_deleted ON receipts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_receipts_tags ON receipts USING GIN(tags);
CREATE INDEX idx_receipts_created ON receipts(created_at DESC);

-- Categories table indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_default ON categories(is_default) WHERE is_default = true;
CREATE INDEX idx_categories_parent ON categories(parent_category_id);

-- Receipt items table indexes
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_category ON receipt_items(category);

-- ========================================
-- Triggers for Automatic Timestamp Updates
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to receipts table
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_settings table
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- Receipts RLS Policies
-- ----------------------------------------

-- SELECT: Users can view their own non-deleted receipts
CREATE POLICY "receipts_select_policy"
  ON receipts
  FOR SELECT
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- INSERT: Users can only insert receipts for themselves
CREATE POLICY "receipts_insert_policy"
  ON receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own receipts
CREATE POLICY "receipts_update_policy"
  ON receipts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own receipts (soft delete via UPDATE)
CREATE POLICY "receipts_delete_policy"
  ON receipts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------
-- Categories RLS Policies
-- ----------------------------------------

-- SELECT: Users can view their own categories AND default categories
CREATE POLICY "categories_select_policy"
  ON categories
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR is_default = true
  );

-- INSERT: Users can only create non-default categories for themselves
CREATE POLICY "categories_insert_policy"
  ON categories
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND is_default = false
  );

-- UPDATE: Users can only update their own non-default categories
CREATE POLICY "categories_update_policy"
  ON categories
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND is_default = false
  );

-- DELETE: Users can only delete their own non-default categories
CREATE POLICY "categories_delete_policy"
  ON categories
  FOR DELETE
  USING (
    auth.uid() = user_id 
    AND is_default = false
  );

-- ----------------------------------------
-- User Settings RLS Policies
-- ----------------------------------------

-- SELECT: Users can only view their own settings
CREATE POLICY "user_settings_select_policy"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only create settings for themselves
CREATE POLICY "user_settings_insert_policy"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own settings
CREATE POLICY "user_settings_update_policy"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ----------------------------------------
-- Receipt Items RLS Policies
-- ----------------------------------------

-- SELECT: Users can view items from their own receipts
CREATE POLICY "receipt_items_select_policy"
  ON receipt_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );

-- INSERT: Users can only add items to their own receipts
CREATE POLICY "receipt_items_insert_policy"
  ON receipt_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );

-- UPDATE: Users can only update items from their own receipts
CREATE POLICY "receipt_items_update_policy"
  ON receipt_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );

-- DELETE: Users can only delete items from their own receipts
CREATE POLICY "receipt_items_delete_policy"
  ON receipt_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );

-- ========================================
-- Views for Common Queries
-- ========================================

-- View: Monthly spending summary
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', receipt_date) AS month,
  category,
  COUNT(*) AS receipt_count,
  SUM(total_amount) AS total_spent,
  AVG(total_amount) AS avg_amount,
  MIN(total_amount) AS min_amount,
  MAX(total_amount) AS max_amount
FROM receipts
WHERE deleted_at IS NULL
GROUP BY user_id, month, category;

COMMENT ON VIEW monthly_summary IS 'Aggregated monthly spending by user and category';

-- View: Recent receipts with category details
CREATE OR REPLACE VIEW recent_receipts_with_categories AS
SELECT
  r.id,
  r.user_id,
  r.merchant_name,
  r.receipt_date,
  r.total_amount,
  r.currency,
  r.category,
  r.image_url,
  r.confidence_score,
  r.created_at,
  c.icon AS category_icon,
  c.color AS category_color
FROM receipts r
LEFT JOIN categories c ON r.category = c.name AND (c.user_id = r.user_id OR c.is_default = true)
WHERE r.deleted_at IS NULL
ORDER BY r.receipt_date DESC, r.created_at DESC;

COMMENT ON VIEW recent_receipts_with_categories IS 'Recent receipts with enriched category information';

-- ========================================
-- Database Functions
-- ========================================

-- Function: Get category breakdown for a date range
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  total_amount NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.category,
    COUNT(*)::BIGINT AS count,
    SUM(r.total_amount) AS total_amount,
    ROUND(
      (SUM(r.total_amount) / NULLIF(
        (SELECT SUM(total_amount) FROM receipts 
         WHERE user_id = p_user_id 
         AND receipt_date BETWEEN p_start_date AND p_end_date
         AND deleted_at IS NULL), 
        0
      ) * 100), 
      2
    ) AS percentage
  FROM receipts r
  WHERE r.user_id = p_user_id
    AND r.receipt_date BETWEEN p_start_date AND p_end_date
    AND r.deleted_at IS NULL
  GROUP BY r.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_category_breakdown IS 'Returns spending breakdown by category for a date range';

-- Function: Get spending trend (daily/weekly/monthly)
CREATE OR REPLACE FUNCTION get_spending_trend(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_interval TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE (
  period TIMESTAMPTZ,
  total_amount NUMERIC,
  receipt_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC(p_interval, r.receipt_date::TIMESTAMPTZ) AS period,
    SUM(r.total_amount) AS total_amount,
    COUNT(*)::BIGINT AS receipt_count
  FROM receipts r
  WHERE r.user_id = p_user_id
    AND r.receipt_date BETWEEN p_start_date AND p_end_date
    AND r.deleted_at IS NULL
  GROUP BY period
  ORDER BY period ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_spending_trend IS 'Returns spending trend aggregated by day/week/month';

-- Function: Search receipts (full-text search)
CREATE OR REPLACE FUNCTION search_receipts(
  p_user_id UUID,
  p_search_term TEXT
)
RETURNS TABLE (
  id UUID,
  merchant_name TEXT,
  receipt_date DATE,
  total_amount NUMERIC,
  category TEXT,
  image_url TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.merchant_name,
    r.receipt_date,
    r.total_amount,
    r.category,
    r.image_url,
    ts_rank(
      to_tsvector('english', 
        COALESCE(r.merchant_name, '') || ' ' || 
        COALESCE(r.notes, '') || ' ' || 
        COALESCE(r.ocr_raw_text, '')
      ),
      plainto_tsquery('english', p_search_term)
    ) AS relevance
  FROM receipts r
  WHERE r.user_id = p_user_id
    AND r.deleted_at IS NULL
    AND (
      to_tsvector('english', 
        COALESCE(r.merchant_name, '') || ' ' || 
        COALESCE(r.notes, '') || ' ' || 
        COALESCE(r.ocr_raw_text, '')
      ) @@ plainto_tsquery('english', p_search_term)
    )
  ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_receipts IS 'Full-text search across merchant name, notes, and OCR text';

-- ========================================
-- Insert Default Categories
-- ========================================

INSERT INTO categories (name, icon, color, is_default, display_order) VALUES
  ('Food & Dining', 'utensils', '#EF4444', true, 1),
  ('Transportation', 'car', '#3B82F6', true, 2),
  ('Office Supplies', 'briefcase', '#8B5CF6', true, 3),
  ('Utilities', 'zap', '#F59E0B', true, 4),
  ('Entertainment', 'film', '#EC4899', true, 5),
  ('Healthcare', 'heart', '#10B981', true, 6),
  ('Travel', 'plane', '#06B6D4', true, 7),
  ('Shopping', 'shopping-bag', '#6366F1', true, 8),
  ('Professional Services', 'users', '#14B8A6', true, 9),
  ('Other', 'more-horizontal', '#6B7280', true, 10)
ON CONFLICT DO NOTHING;

-- ========================================
-- Sample Data (Optional - for testing)
-- ========================================

-- Uncomment below to insert sample data for testing

/*
-- Insert sample user settings (will fail if user doesn't exist)
-- This is just an example - real user_id should come from auth.users
INSERT INTO user_settings (user_id, default_currency, theme) VALUES
  ('00000000-0000-0000-0000-000000000000', 'CAD', 'light')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample receipt (will fail if user doesn't exist)
INSERT INTO receipts (
  user_id, 
  merchant_name, 
  receipt_date, 
  total_amount, 
  category, 
  image_url,
  notes
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'Starbucks',
    '2026-01-27',
    15.99,
    'Food & Dining',
    'https://example.com/receipt.jpg',
    'Morning coffee meeting'
  )
ON CONFLICT DO NOTHING;
*/

-- ========================================
-- Grants (if needed for service accounts)
-- ========================================

-- Grant usage to authenticated users (handled by Supabase Auth + RLS)
-- No additional grants needed for standard setup

-- ========================================
-- Migration Complete
-- ========================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'LedgerSnap database migration completed successfully!';
  RAISE NOTICE 'Tables created: receipts, categories, user_settings, receipt_items';
  RAISE NOTICE 'Default categories: % rows', (SELECT COUNT(*) FROM categories WHERE is_default = true);
END $$;
