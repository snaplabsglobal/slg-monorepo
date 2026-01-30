-- ============================================================================
-- GIFI Codes Initialization
-- ============================================================================
-- Purpose: Create GIFI codes reference table and populate with BC construction
--          industry common codes to support receipt analysis and categorization
-- ============================================================================

-- Create GIFI codes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'gifi_codes'
  ) THEN
    CREATE TABLE gifi_codes (
      code TEXT PRIMARY KEY CHECK (code ~ '^\d{4}$'),
      name TEXT NOT NULL,
      description TEXT,
      category_type TEXT CHECK (category_type IN ('expense', 'revenue', 'asset', 'liability')),
      is_common BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    COMMENT ON TABLE gifi_codes IS 'Canadian GIFI (General Index of Financial Information) tax codes';
    COMMENT ON COLUMN gifi_codes.code IS '4-digit GIFI code';
    COMMENT ON COLUMN gifi_codes.name IS 'Short name/description of the code';
    COMMENT ON COLUMN gifi_codes.description IS 'Detailed description';
    COMMENT ON COLUMN gifi_codes.category_type IS 'Type of account category';
    COMMENT ON COLUMN gifi_codes.is_common IS 'Whether this code is commonly used in BC construction industry';
  END IF;
END $$;

-- Insert BC construction industry common GIFI codes
INSERT INTO gifi_codes (code, name, description, category_type, is_common) VALUES
  -- Materials and Supplies
  ('8320', 'Materials/Supplies', 'Construction materials, supplies, and inventory', 'expense', true),
  
  -- Vehicle Expenses
  ('9281', 'Fuel Costs', 'Gas, diesel, and other vehicle fuel', 'expense', true),
  ('9282', 'Vehicle Repairs & Maintenance', 'Vehicle servicing and repairs', 'expense', true),
  ('9283', 'Vehicle Licenses & Insurance', 'Vehicle registration and insurance', 'expense', true),
  
  -- Office and Administrative
  ('8810', 'Office Supplies', 'Stationery, paper, office equipment', 'expense', true),
  ('8860', 'Advertising & Promotion', 'Marketing and advertising expenses', 'expense', false),
  ('8862', 'Professional Services', 'Legal, accounting, consulting fees', 'expense', true),
  
  -- Meals and Entertainment
  ('8523', 'Meals & Entertainment', 'Business meals (50% deductible)', 'expense', true),
  
  -- Utilities
  ('9220', 'Utilities', 'Electricity, gas, water', 'expense', true),
  ('9225', 'Telephone & Internet', 'Phone bills and internet service', 'expense', true),
  
  -- Rent and Property
  ('9200', 'Rent', 'Office or warehouse rent', 'expense', false),
  ('9180', 'Property Taxes', 'Municipal property taxes', 'expense', false),
  
  -- Insurance
  ('9804', 'Business Insurance', 'General liability insurance', 'expense', true),
  
  -- Equipment and Tools
  ('8690', 'Tools < $500', 'Small tools and equipment', 'expense', true),
  ('8670', 'Equipment Rental', 'Rental of construction equipment', 'expense', true),
  
  -- Other
  ('8760', 'Other Expenses', 'Miscellaneous business expenses', 'expense', true),
  ('9270', 'Bank Charges', 'Banking fees and service charges', 'expense', false)
ON CONFLICT (code) DO NOTHING;

-- Create index for common codes lookup
CREATE INDEX IF NOT EXISTS idx_gifi_codes_common ON gifi_codes(is_common) WHERE is_common = true;
CREATE INDEX IF NOT EXISTS idx_gifi_codes_category ON gifi_codes(category_type);

-- Verify insertion
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM gifi_codes;
  RAISE NOTICE 'GIFI codes initialized: % codes inserted', v_count;
END $$;
