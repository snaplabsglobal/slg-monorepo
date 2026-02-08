# Service Snap QR - Database Quick Reference Card

**Version:** 1.0 | **Date:** 2026-01-26

---

## 🚀 Quick Start (3 Steps)

```bash
1. Open Supabase SQL Editor
   → https://supabase.com/dashboard/project/YOUR-PROJECT/sql

2. Execute migrations in order:
   ✅ service_snap_qr_migration.sql       (Core tables)
   ✅ home_hero_sticker_campaign_migration.sql  (Campaign)
   ✅ test_data.sql                        (Sample data)

3. Verify:
   → Dashboard → Table Editor → Should see 11 tables
```

---

## 📊 Database Schema (11 Tables)

### Core Tables (8)
```
1. properties              Building/property information
2. companies              Service providers (HVAC, plumbing, etc.)
3. equipment_registry     Equipment with QR codes (MAIN TABLE)
4. service_history        Service & maintenance records
5. qr_scan_logs          QR code scan tracking
6. service_requests      Service inquiries from homeowners
7. company_ratings       Company reviews & ratings
8. qr_generation_config  QR generation settings
```

### Campaign Tables (3)
```
9.  qr_batches               Batch tracking (10K codes/batch)
10. pre_activation_qr_codes  Pre-printed QR codes
11. user_subscription_tiers  Home Hero/Pro/Enterprise
```

---

## 🔑 Key Concepts

### Privacy Levels
```yaml
public:     Anyone can view equipment info
private:    Owner and servicing technicians only
authorized: Requires 6-digit access code
```

### Subscription Tiers
```yaml
Home Hero (Free):
  - Max 20 equipment
  - Max 5 properties
  - Basic features

Pro ($29/month):
  - Unlimited equipment
  - Unlimited properties
  - Advanced features

Enterprise (Custom):
  - Pro features
  - Dedicated support
  - White-label options
```

### QR Code Format
```
SSQ-YYYY-BBB-XXXXXXXX
│   │    │   └─ Unique ID (8 chars)
│   │    └───── Batch number (3 digits)
│   └────────── Year (4 digits)
└────────────── Service Snap QR prefix
```

---

## 📍 Test Data Overview

### Vancouver Test Data Included

**Properties (5):**
- Smith Residence (Vancouver)
- Chen Family Home (Burnaby)
- Johnson Townhouse (Richmond)
- Downtown Office Tower (Vancouver)
- Metrotown Shopping Centre (Burnaby)

**Companies (4):**
- HVAC Pro Vancouver
- Metro Plumbing & Heating
- Burnaby Furnace Experts
- Richmond HVAC Solutions

**Equipment (10):**
- Furnaces (3)
- Water Heaters (2)
- Boilers (2)
- Heat Pumps (1)
- Commercial equipment (2)

**Service Records:** 15 complete service histories
**Ratings:** 5 company reviews (4-5 stars)

---

## 🔍 Essential SQL Queries

### Query 1: Count All Records
```sql
SELECT 
  'equipment' as type, COUNT(*) FROM equipment_registry
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'service_history', COUNT(*) FROM service_history;
```

### Query 2: Find Equipment by QR Code
```sql
SELECT * FROM equipment_registry 
WHERE qr_code = 'SSQ-2026-001-ABCD1234';
```

### Query 3: Get Equipment with Service History
```sql
SELECT 
  e.equipment_type,
  e.manufacturer,
  e.model_number,
  COUNT(s.id) as service_count,
  MAX(s.service_date) as last_service
FROM equipment_registry e
LEFT JOIN service_history s ON e.id = s.equipment_id
GROUP BY e.id, e.equipment_type, e.manufacturer, e.model_number;
```

### Query 4: Find Nearby Companies (10km radius)
```sql
SELECT 
  company_name,
  service_categories,
  ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(-123.1207, 49.2827), 4326)::geography
  ) / 1000 as distance_km
FROM companies
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-123.1207, 49.2827), 4326)::geography,
  10000
)
ORDER BY distance_km;
```

### Query 5: Equipment Needing Service
```sql
SELECT 
  e.qr_code,
  e.equipment_type,
  e.manufacturer,
  e.next_service_due,
  p.name as property_name
FROM equipment_registry e
JOIN properties p ON e.property_id = p.id
WHERE e.next_service_due <= CURRENT_DATE + INTERVAL '30 days'
  AND e.is_active = true
ORDER BY e.next_service_due;
```

### Query 6: Company Average Rating
```sql
SELECT 
  c.company_name,
  COUNT(r.id) as review_count,
  ROUND(AVG(r.rating), 2) as avg_rating,
  ROUND(AVG(r.response_time_rating), 2) as avg_response_time,
  ROUND(AVG(r.professionalism_rating), 2) as avg_professionalism
FROM companies c
LEFT JOIN company_ratings r ON c.id = r.company_id
GROUP BY c.id, c.company_name
ORDER BY avg_rating DESC;
```

### Query 7: Generate QR Batch
```sql
-- Generate 1000 new QR codes
SELECT generate_qr_batch(
  'BATCH-2026-NEW',
  1000,
  'wholesale',
  'New batch for distribution'
);
```

### Query 8: Activation Statistics
```sql
SELECT 
  b.batch_name,
  b.quantity_generated,
  COUNT(CASE WHEN p.is_activated THEN 1 END) as activated_count,
  ROUND(
    COUNT(CASE WHEN p.is_activated THEN 1 END)::numeric / 
    b.quantity_generated * 100, 
    2
  ) as activation_rate_percent
FROM qr_batches b
LEFT JOIN pre_activation_qr_codes p ON b.batch_id = p.batch_id
GROUP BY b.batch_id, b.batch_name, b.quantity_generated;
```

---

## 🔧 Useful Functions

### Update Location Geography
```sql
-- After inserting lat/long, update geography point
UPDATE properties 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL;

UPDATE companies 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL;
```

### Calculate Distance
```sql
-- Distance between two points in kilometers
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
  ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
) / 1000 as distance_km;
```

---

## 🎯 Test User IDs (Placeholders)

**Replace these with real Supabase Auth UUIDs:**

```yaml
'11111111-1111-1111-1111-111111111111':
  Name: John Smith
  Email: john.smith@example.com
  Role: Homeowner

'22222222-2222-2222-2222-222222222222':
  Name: Mike Chen
  Email: mike@hvacprovancouver.com
  Role: HVAC Technician

'33333333-3333-3333-3333-333333333333':
  Name: Sarah Johnson
  Email: sarah@pmvancouver.com
  Role: Property Manager
```

**Update script:**
```sql
UPDATE properties SET owner_id = 'REAL-UUID' 
WHERE owner_id = '11111111-1111-1111-1111-111111111111';

UPDATE equipment_registry SET current_owner_id = 'REAL-UUID'
WHERE current_owner_id = '11111111-1111-1111-1111-111111111111';

UPDATE user_subscription_tiers SET user_id = 'REAL-UUID'
WHERE user_id = '11111111-1111-1111-1111-111111111111';
```

---

## 🚨 Important Reminders

### Before Going to Production:
- [ ] Enable RLS on all tables
- [ ] Update test user IDs to real UUIDs
- [ ] Configure environment variables
- [ ] Set up database backups
- [ ] Review and adjust RLS policies
- [ ] Test all privacy levels
- [ ] Verify geographic searches work
- [ ] Test QR generation at scale

### Security Checklist:
- [ ] RLS enabled ✅ (Defined, needs activation)
- [ ] API rate limiting (To implement)
- [ ] Input validation (To implement)
- [ ] HTTPS only ✅ (Vercel default)
- [ ] Environment variables secured ✅
- [ ] Audit logging (Consider adding)

---

## 📞 Quick Links

```
Supabase Dashboard:
https://supabase.com/dashboard/project/YOUR-PROJECT

SQL Editor:
https://supabase.com/dashboard/project/YOUR-PROJECT/sql

Table Editor:
https://supabase.com/dashboard/project/YOUR-PROJECT/editor

Authentication:
https://supabase.com/dashboard/project/YOUR-PROJECT/auth/users

Logs:
https://supabase.com/dashboard/project/YOUR-PROJECT/logs/database
```

---

## 🎓 Common DXA (Coordinate) Values

**Geographic Search Examples:**

```yaml
Downtown Vancouver:
  Lat: 49.2827
  Lng: -123.1207

Burnaby Central:
  Lat: 49.2488
  Lng: -122.9805

Richmond Centre:
  Lat: 49.1666
  Lng: -123.1336

North Vancouver:
  Lat: 49.3200
  Lng: -123.0690

Surrey Central:
  Lat: 49.1913
  Lng: -122.8490
```

---

## 💡 Pro Tips

1. **Always use transactions for batch operations:**
   ```sql
   BEGIN;
   -- your operations
   COMMIT;
   ```

2. **Use EXPLAIN ANALYZE to check query performance:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM equipment_registry WHERE qr_code = '...';
   ```

3. **Index on frequently searched columns:**
   - All indexes already created in migration
   - Check with: `\d+ equipment_registry` in psql

4. **Test geographic queries with realistic distances:**
   - 5km = typical city neighborhood
   - 20km = city coverage
   - 50km = metro area coverage

5. **Monitor slow queries in Supabase logs:**
   - Dashboard → Logs → Database
   - Look for queries >1000ms

---

## 📊 Expected Performance

### Query Benchmarks (with indexes):

```yaml
Single equipment lookup by QR:     <5ms
Service history for equipment:     <10ms
Nearby companies (50km radius):    <50ms
Full-text search:                  <100ms
Batch QR generation (1000):        <30s
```

---

## 🔄 Next Steps After Migration

### Week 1-2: Authentication
```
☐ Create login/register pages
☐ Integrate Supabase Auth
☐ Implement session management
☐ Update test user IDs
☐ Enable RLS
```

### Week 3-4: Core APIs
```
☐ QR generation API
☐ QR scanning API
☐ Equipment CRUD APIs
☐ Service history APIs
☐ Company search API
```

### Week 5-6: Frontend
```
☐ Technician dashboard
☐ Homeowner portal
☐ Public QR scan pages
☐ Service request forms
```

---

**🎉 Database is ready! Time to build the features!**

---

**Prepared by:** Patrick Jiang (CTO), SnapLabs Global  
**Document:** Quick Reference Card  
**Version:** 1.0  
**Date:** January 26, 2026
