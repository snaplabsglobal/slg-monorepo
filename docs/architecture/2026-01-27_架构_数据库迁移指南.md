# Service Snap QR - Database Migration Execution Guide

**SnapLabs Global**  
**Document Version:** 1.0  
**Date:** January 26, 2026  
**Author:** Patrick Jiang (CTO)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Files](#migration-files)
4. [Step-by-Step Execution](#step-by-step-execution)
5. [Verification & Testing](#verification-testing)
6. [User Setup](#user-setup)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)
9. [Next Steps](#next-steps)

---

## 🎯 Overview

This guide will walk you through executing the complete database migration for **Service Snap QR**. The migration includes:

- **Core System** (8 tables): Equipment registry, service history, companies, properties
- **Home Hero Campaign** (4 tables): QR batch management, pre-activation codes, subscription tiers
- **Supporting Features**: Indexes, triggers, views, RLS policies
- **Test Data**: 100+ realistic records for Vancouver area

### What You'll Accomplish

✅ Complete database schema setup  
✅ All tables, indexes, and constraints created  
✅ Test data loaded for immediate development  
✅ System ready for authentication integration

### Estimated Time

- **Reading this guide:** 15 minutes
- **Executing migration:** 10 minutes
- **Verification:** 10 minutes
- **Total:** ~35 minutes

---

## ✅ Prerequisites

### 1. Supabase Project Setup

You should have:
- ✅ Active Supabase project (created in Phase 1)
- ✅ Access to Supabase Dashboard
- ✅ Project URL and API keys

**Find your Supabase Dashboard:**
```
https://supabase.com/dashboard/project/YOUR-PROJECT-ID
```

### 2. Required Files

Ensure you have these files ready:

| File | Size | Purpose |
|------|------|---------|
| `service_snap_qr_migration.sql` | ~50KB | Core tables & features |
| `home_hero_sticker_campaign_migration.sql` | ~30KB | Campaign system |
| `test_data.sql` | ~80KB | Sample data |

### 3. Access Requirements

- [ ] Supabase project owner or admin access
- [ ] SQL Editor permissions
- [ ] Ability to view table structure

---

## 📁 Migration Files

### File 1: Core Migration (`service_snap_qr_migration.sql`)

**Contains:**
```yaml
Tables (8):
  - properties          # Property/building information
  - companies           # Service companies
  - equipment_registry  # Equipment with QR codes
  - service_history     # Service records
  - qr_scan_logs       # Scan tracking
  - service_requests   # Service inquiries
  - company_ratings    # Company reviews
  - qr_generation_config # QR settings

Features:
  - 20+ optimized indexes
  - Geographic search (PostGIS)
  - Full-text search
  - Auto-updating timestamps
  - Data validation triggers
  - Privacy controls (RLS)
  - Helper functions
```

### File 2: Home Hero Campaign (`home_hero_sticker_campaign_migration.sql`)

**Contains:**
```yaml
Tables (4):
  - qr_batches                 # Batch tracking
  - pre_activation_qr_codes    # Pre-printed codes
  - user_subscription_tiers    # Home Hero/Pro/Enterprise
  - Equipment extensions       # Batch linking

Features:
  - Bulk QR generation (10,000+)
  - Activation workflow
  - Subscription limits
  - Campaign analytics
  - Conversion tracking
```

### File 3: Test Data (`test_data.sql`)

**Contains:**
```yaml
Realistic Vancouver Data:
  - 5 properties (residential + commercial)
  - 4 service companies
  - 10 equipment items
  - 15 service records
  - 6 QR scan logs
  - 3 service requests
  - 5 company ratings
  - 3 subscription tiers
  - 3 QR batches
  - 10 pre-activation codes

Includes:
  - Real Vancouver addresses
  - HVAC company profiles
  - Complete service histories
  - Rating and review samples
```

---

## 🚀 Step-by-Step Execution

### Step 1: Access Supabase SQL Editor

1. **Navigate to your Supabase project:**
   ```
   https://supabase.com/dashboard/project/YOUR-PROJECT-ID
   ```

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Or go to: `https://supabase.com/dashboard/project/YOUR-PROJECT-ID/sql`

3. **Create a new query:**
   - Click "+ New query" button
   - Name it: "Service Snap QR - Core Migration"

### Step 2: Execute Core Migration

1. **Open the migration file:**
   - Open `service_snap_qr_migration.sql` in your text editor
   - Select ALL content (Ctrl+A / Cmd+A)
   - Copy to clipboard

2. **Paste into SQL Editor:**
   - Paste the entire SQL script into the Supabase SQL Editor

3. **Review before execution:**
   ```sql
   -- You should see sections like:
   -- PART 1: CORE TABLES
   -- PART 2: INDEXES
   -- PART 3: TRIGGERS AND FUNCTIONS
   -- PART 4: ROW LEVEL SECURITY
   -- etc.
   ```

4. **Execute the migration:**
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - ⏱️ **Wait time:** ~30-60 seconds

5. **Verify success:**
   ```
   ✅ Look for "Success. No rows returned" message
   ✅ Check for green checkmark icon
   ❌ If errors appear, see Troubleshooting section
   ```

### Step 3: Execute Home Hero Campaign Migration

1. **Create new query:**
   - Click "+ New query" again
   - Name it: "Home Hero Sticker Campaign"

2. **Load campaign migration:**
   - Open `home_hero_sticker_campaign_migration.sql`
   - Copy entire contents
   - Paste into new SQL Editor tab

3. **Execute:**
   - Click "Run" button
   - ⏱️ **Wait time:** ~20-30 seconds

4. **Verify success:**
   - Should see "Success" message
   - No errors in output

### Step 4: Load Test Data

1. **Create new query:**
   - Name it: "Test Data - Vancouver"

2. **Load test data file:**
   - Open `test_data.sql`
   - Copy entire contents
   - Paste into SQL Editor

3. **Important note about test users:**
   ```sql
   -- Test data uses placeholder user IDs:
   -- '11111111-1111-1111-1111-111111111111' - John Smith (Homeowner)
   -- '22222222-2222-2222-2222-222222222222' - Mike Chen (Technician)
   -- '33333333-3333-3333-3333-333333333333' - Sarah Johnson (Property Manager)
   
   -- You'll update these with real user IDs later
   ```

4. **Execute:**
   - Click "Run" button
   - ⏱️ **Wait time:** ~15-30 seconds

5. **Verify data loaded:**
   ```sql
   -- You should see summary output:
   ========================================
   TEST DATA SUMMARY
   ========================================
   Properties: 5
   Companies: 4
   Equipment: 10
   Service History: 15
   QR Scan Logs: 6
   Service Requests: 3
   Company Ratings: 5
   Subscription Tiers: 3
   QR Batches: 3
   Pre-activation Codes: 10
   ========================================
   ```

---

## ✅ Verification & Testing

### Verify Tables Created

1. **Go to Table Editor:**
   ```
   Dashboard → Table Editor
   ```

2. **Check for these tables:**
   ```
   ✅ properties
   ✅ companies
   ✅ equipment_registry
   ✅ service_history
   ✅ qr_scan_logs
   ✅ service_requests
   ✅ company_ratings
   ✅ qr_generation_config
   ✅ qr_batches
   ✅ pre_activation_qr_codes
   ✅ user_subscription_tiers
   ```

### Test Queries

Run these queries in SQL Editor to verify data:

#### Query 1: Count Records
```sql
SELECT 
  'properties' as table_name, COUNT(*) as count FROM properties
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'equipment_registry', COUNT(*) FROM equipment_registry
UNION ALL
SELECT 'service_history', COUNT(*) FROM service_history;
```

**Expected output:**
```
properties        | 5
companies         | 4
equipment_registry| 10
service_history   | 15
```

#### Query 2: View Sample Equipment
```sql
SELECT 
  qr_code,
  equipment_type,
  manufacturer,
  model_number,
  privacy_level,
  is_active
FROM equipment_registry
LIMIT 5;
```

**Expected:** 5 equipment records with QR codes starting with "SSQ-2026-"

#### Query 3: Test Geographic Search
```sql
-- Find companies within 10km of downtown Vancouver
SELECT 
  company_name,
  city,
  service_categories,
  ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(-123.1207, 49.2827), 4326)::geography
  ) / 1000 as distance_km
FROM companies
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-123.1207, 49.2827), 4326)::geography,
  10000  -- 10km
)
ORDER BY distance_km;
```

**Expected:** List of companies sorted by distance from downtown Vancouver

#### Query 4: Test Service History
```sql
SELECT 
  e.equipment_type,
  e.manufacturer,
  s.service_date,
  s.service_type,
  s.total_cost,
  c.company_name,
  s.rating
FROM service_history s
JOIN equipment_registry e ON s.equipment_id = e.id
JOIN companies c ON s.company_id = c.id
ORDER BY s.service_date DESC
LIMIT 10;
```

**Expected:** 10 most recent service records with company and equipment info

### Verify Indexes

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('equipment_registry', 'service_history', 'companies')
ORDER BY tablename, indexname;
```

**Expected:** 20+ indexes across your tables

### Test Functions

#### Test QR Batch Generation
```sql
-- Generate a test batch of 10 QR codes
SELECT generate_qr_batch(
  'TEST-BATCH-001',
  10,
  'testing',
  'Manual test batch'
);

-- Verify created
SELECT * FROM qr_batches WHERE batch_id = 'TEST-BATCH-001';
SELECT COUNT(*) FROM pre_activation_qr_codes WHERE batch_id = 'TEST-BATCH-001';
```

**Expected:** Batch created with 10 pre-activation codes

---

## 👥 User Setup

### Understanding Test User IDs

The test data uses **placeholder UUIDs** for users:

```yaml
Placeholder UUIDs (NOT REAL):
  '11111111-1111-1111-1111-111111111111':
    Name: John Smith
    Role: Homeowner
    Email: john.smith@example.com
  
  '22222222-2222-2222-2222-222222222222':
    Name: Mike Chen
    Role: HVAC Technician (Company Owner)
    Email: mike@hvacprovancouver.com
  
  '33333333-3333-3333-3333-333333333333':
    Name: Sarah Johnson
    Role: Property Manager
    Email: sarah@pmvancouver.com
```

### Option 1: Create Test Users in Supabase Auth

**Step 1: Create users in Authentication**

1. Go to: `Dashboard → Authentication → Users`
2. Click "+ Add user"
3. Create each user:
   - Email: `john.smith@example.com`
   - Password: `TestPassword123!`
   - Auto Confirm: ✅
   - Click "Create user"
4. **Copy the generated UUID** from the user list

**Step 2: Update database with real UUIDs**

```sql
-- Example: Replace placeholder with real UUID
-- Get real UUID from Authentication → Users list

-- Update John Smith's data
UPDATE properties 
SET owner_id = 'REAL-UUID-FROM-AUTH-PANEL'
WHERE owner_id = '11111111-1111-1111-1111-111111111111';

UPDATE equipment_registry
SET current_owner_id = 'REAL-UUID-FROM-AUTH-PANEL'
WHERE current_owner_id = '11111111-1111-1111-1111-111111111111';

UPDATE user_subscription_tiers
SET user_id = 'REAL-UUID-FROM-AUTH-PANEL'
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Repeat for Mike Chen and Sarah Johnson
```

### Option 2: Keep Placeholder IDs for Development

For initial development, you can keep the placeholder IDs:

```sql
-- No changes needed - just use placeholders
-- Update later when building authentication
```

**⚠️ Warning:** RLS policies may block access with placeholder IDs until real auth is implemented.

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Extension postgis does not exist"

**Error message:**
```
ERROR:  extension "postgis" does not exist
```

**Solution:**
```sql
-- Enable PostGIS extension first
CREATE EXTENSION IF NOT EXISTS postgis;

-- Then re-run the migration
```

#### Issue 2: "Duplicate key value violates unique constraint"

**Error message:**
```
ERROR: duplicate key value violates unique constraint "equipment_registry_qr_code_key"
```

**Solution:**
This means tables already have data. Either:

**Option A: Drop and recreate (DANGER - loses data)**
```sql
DROP TABLE IF EXISTS equipment_registry CASCADE;
DROP TABLE IF EXISTS service_history CASCADE;
-- ... drop all tables
-- Then re-run migration
```

**Option B: Skip test data**
```sql
-- Don't run test_data.sql if tables have existing data
```

#### Issue 3: "Permission denied for schema public"

**Solution:**
```sql
-- Grant necessary permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

#### Issue 4: Slow Query Execution

**If migration takes >2 minutes:**

- Check Supabase project instance size
- Verify internet connection
- Try splitting migration into smaller chunks
- Run indexes AFTER data insertion

#### Issue 5: Geographic Functions Not Working

**Error:**
```
ERROR: function st_setsrid(point, integer) does not exist
```

**Solution:**
```sql
-- Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_Version();
```

### Getting Help

If you encounter issues not covered here:

1. **Check Supabase logs:**
   ```
   Dashboard → Logs → Database
   ```

2. **Supabase documentation:**
   ```
   https://supabase.com/docs/guides/database
   ```

3. **PostGIS documentation:**
   ```
   https://postgis.net/documentation/
   ```

---

## 🔄 Rollback Procedures

### Complete Rollback (Nuclear Option)

⚠️ **WARNING:** This will delete ALL tables and data!

```sql
-- Drop all tables in correct order (respects foreign keys)
DROP TABLE IF EXISTS company_ratings CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS qr_scan_logs CASCADE;
DROP TABLE IF EXISTS service_history CASCADE;
DROP TABLE IF EXISTS pre_activation_qr_codes CASCADE;
DROP TABLE IF EXISTS qr_batches CASCADE;
DROP TABLE IF EXISTS equipment_registry CASCADE;
DROP TABLE IF EXISTS user_subscription_tiers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS qr_generation_config CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS privacy_level CASCADE;
DROP TYPE IF EXISTS service_request_status CASCADE;

-- Verify all dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Partial Rollback (Remove Test Data Only)

```sql
-- Keep schema, remove test data
BEGIN;

DELETE FROM company_ratings;
DELETE FROM service_requests;
DELETE FROM qr_scan_logs;
DELETE FROM service_history;
DELETE FROM pre_activation_qr_codes;
DELETE FROM qr_batches WHERE batch_id LIKE 'BATCH-2026%';
DELETE FROM equipment_registry;
DELETE FROM user_subscription_tiers;
DELETE FROM companies;
DELETE FROM properties;

COMMIT;

-- Verify data removed
SELECT 
  (SELECT COUNT(*) FROM properties) as properties_count,
  (SELECT COUNT(*) FROM equipment_registry) as equipment_count;
```

---

## 🎯 Next Steps

### Immediate Next Steps (Week 1-2)

#### 1. Authentication System Development

**Priority:** P0 (Highest)

```yaml
Tasks:
  ☐ Create /login page
  ☐ Create /register page
  ☐ Integrate Supabase Auth
  ☐ Implement session management
  ☐ Add password reset flow
  ☐ Create authentication middleware

Files to create:
  - app/login/page.tsx
  - app/register/page.tsx
  - app/api/auth/callback/route.ts
  - middleware.ts
  - lib/supabase/client.ts
  - lib/supabase/server.ts
```

#### 2. Update Test User IDs

After creating real users:

```sql
-- Script location: /supabase/scripts/update_test_users.sql

UPDATE properties SET owner_id = '[real-uuid]' 
WHERE owner_id = '11111111-1111-1111-1111-111111111111';

-- ... repeat for all tables
```

#### 3. Enable Row Level Security (RLS)

**CRITICAL:** RLS policies are defined but not enforced yet.

```sql
-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;
-- ... continue for all tables
```

### Week 3-4: API Development

```yaml
API Endpoints to create:
  Equipment:
    - POST   /api/qr/generate
    - GET    /api/qr/scan/:qr_code
    - POST   /api/qr/activate
    - GET    /api/equipment/:id
    - PATCH  /api/equipment/:id
  
  Service:
    - POST   /api/service/history
    - GET    /api/service/history/:equipment_id
    - GET    /api/service/nearby-companies
  
  Properties:
    - GET    /api/properties
    - POST   /api/properties
    - GET    /api/properties/:id
```

### Week 5-6: Frontend Development

```yaml
Pages to create:
  Technician Portal:
    - /dashboard
    - /equipment/new
    - /equipment/:id
    - /qr/generate
  
  Homeowner Portal:
    - /scan/:qr_code
    - /my-equipment
    - /service-request
  
  Public Pages:
    - /equipment/:qr_code (public view)
```

### Week 7-8: Home Hero Campaign Launch

```yaml
Tasks:
  ☐ Design QR code sticker template
  ☐ Contact printing supplier
  ☐ Generate 10,000 QR codes
  ☐ Create batch tracking dashboard
  ☐ Set up campaign analytics
  ☐ Contact Emco Vancouver
  ☐ Contact Andrew Sheret Burnaby
```

---

## 📊 Database Schema Summary

### Table Relationships

```
properties (建筑物)
    ↓ 1:N
equipment_registry (设备)
    ↓ 1:N
service_history (服务记录)
    ↓ N:1
companies (服务公司)
    ↓ 1:N
company_ratings (公司评分)

equipment_registry
    ↓ 1:N
qr_scan_logs (扫描日志)

equipment_registry
    ↓ 1:N
service_requests (服务请求)

equipment_registry ← 1:1 → pre_activation_qr_codes
    ↑
    └── 1:N
        qr_batches (批次管理)
```

### Key Features by Table

#### equipment_registry
- QR code unique identifier
- Privacy levels (public/private/authorized)
- Geographic location
- Service scheduling
- Warranty tracking

#### service_history
- Complete audit trail
- Cost tracking
- Photo documentation
- Ratings & reviews
- Next service recommendations

#### companies
- Service categories & specializations
- Geographic coverage (radius)
- Verification status
- Contact information
- Rating aggregation

#### properties
- Multiple equipment per property
- Owner information
- Geographic search
- Property type classification

---

## 🎉 Completion Checklist

Use this checklist to confirm successful migration:

### Database Migration
- [ ] Core tables created (8 tables)
- [ ] Campaign tables created (4 tables)
- [ ] All indexes created (20+)
- [ ] Triggers and functions working
- [ ] Views created
- [ ] RLS policies defined
- [ ] Test data loaded successfully

### Verification Tests
- [ ] Sample queries run without errors
- [ ] Geographic search working
- [ ] QR batch generation tested
- [ ] Relationships intact (foreign keys)
- [ ] Counts match expected values

### Next Steps Ready
- [ ] Authentication plan documented
- [ ] API endpoint list created
- [ ] User IDs update strategy defined
- [ ] Development environment ready

---

## 📚 Additional Resources

### Documentation
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

### SQL Learning Resources
- [Supabase SQL Tutorial](https://supabase.com/docs/guides/database/sql-editor)
- [PostGIS Tutorial](https://postgis.net/workshops/postgis-intro/)

### Project Files
- Project Milestone Document: `PROJECT_MILESTONE_2026-01-26.md`
- Home Hero Campaign Spec: `HOME_HERO_STICKER_CAMPAIGN_SPEC.md`
- Migration Files: `service_snap_qr_migration.sql`, `home_hero_sticker_campaign_migration.sql`
- Test Data: `test_data.sql`

---

## 📝 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-26 | 1.0 | Initial documentation created |

---

## ✉️ Support

For questions or issues:

**CTO:** Patrick Jiang  
**Project:** SnapLabs Global - Service Snap QR  
**Status:** MVP Development Phase

---

**🎉 Congratulations! You're ready to execute the database migration!**

Follow each step carefully, verify at each stage, and you'll have a fully functional database ready for development.

**Next Document:** Authentication System Implementation Guide (Week 1-2)
