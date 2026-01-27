-- ============================================================================
-- Service Snap QR - Test Data
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-26
-- Description: Realistic test data for Vancouver area
-- ============================================================================

-- IMPORTANT: This script assumes:
-- 1. Core migration has been run successfully
-- 2. Supabase Auth users exist (we'll use placeholder UUIDs)
-- 3. You'll replace user UUIDs with actual auth.users IDs after user registration

BEGIN;

-- ============================================================================
-- PART 1: TEST USERS (Placeholder UUIDs)
-- ============================================================================
-- In production, these will come from auth.users table
-- Replace these UUIDs with actual user IDs from Supabase Auth Dashboard

-- Test User IDs (you'll need to create these users in Supabase Auth first)
-- User 1: John Smith (Homeowner) - john.smith@example.com
-- User 2: Mike Chen (Technician) - mike@hvacprovancouver.com
-- User 3: Sarah Johnson (Property Manager) - sarah@pmvancouver.com

-- For now, we'll use these placeholder UUIDs:
-- '11111111-1111-1111-1111-111111111111' -- John Smith
-- '22222222-2222-2222-2222-222222222222' -- Mike Chen
-- '33333333-3333-3333-3333-333333333333' -- Sarah Johnson

-- ============================================================================
-- PART 2: PROPERTIES (Vancouver Area)
-- ============================================================================

INSERT INTO properties (
    id, name, property_type, address_line1, city, province, postal_code, 
    latitude, longitude, owner_id, owner_name, owner_email, owner_phone, notes
) VALUES 
-- Residential Properties
(
    '10000001-0000-0000-0000-000000000001',
    'Smith Residence',
    'residential',
    '123 Main Street',
    'Vancouver',
    'BC',
    'V6B 1A1',
    49.2827,
    -123.1207,
    '11111111-1111-1111-1111-111111111111',
    'John Smith',
    'john.smith@example.com',
    '+1-604-555-0101',
    'Single family home, built 2010'
),
(
    '10000001-0000-0000-0000-000000000002',
    'Chen Family Home',
    'residential',
    '456 Oak Avenue',
    'Burnaby',
    'BC',
    'V5C 2A1',
    49.2488,
    -122.9805,
    '11111111-1111-1111-1111-111111111111',
    'David Chen',
    'david.chen@example.com',
    '+1-604-555-0102',
    'Two-story house with basement'
),
(
    '10000001-0000-0000-0000-000000000003',
    'Johnson Townhouse',
    'residential',
    '789 Maple Drive, Unit 5',
    'Richmond',
    'BC',
    'V6X 1A2',
    49.1666,
    -123.1336,
    '33333333-3333-3333-3333-333333333333',
    'Sarah Johnson',
    'sarah@pmvancouver.com',
    '+1-604-555-0103',
    'Townhouse complex, 3 bedrooms'
),

-- Commercial Properties
(
    '10000001-0000-0000-0000-000000000004',
    'Downtown Office Tower',
    'commercial',
    '1055 West Georgia Street',
    'Vancouver',
    'BC',
    'V6E 3P3',
    49.2839,
    -123.1216,
    '33333333-3333-3333-3333-333333333333',
    'Pacific Property Management',
    'info@pacificpm.ca',
    '+1-604-555-0200',
    '15-floor office building, built 2005'
),
(
    '10000001-0000-0000-0000-000000000005',
    'Metrotown Shopping Centre - Food Court',
    'commercial',
    '4700 Kingsway',
    'Burnaby',
    'BC',
    'V5H 4M1',
    49.2256,
    -123.0033,
    '33333333-3333-3333-3333-333333333333',
    'Retail Management Corp',
    'facilities@metrotown.ca',
    '+1-604-555-0201',
    'Large commercial kitchen and HVAC systems'
);

-- Update location geography points
UPDATE properties 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- PART 3: COMPANIES (Service Providers)
-- ============================================================================

INSERT INTO companies (
    id, company_name, service_categories, specializations, 
    contact_name, email, phone, website,
    address_line1, city, province, postal_code,
    latitude, longitude, service_radius_km,
    is_verified, is_active, license_number, owner_id, description
) VALUES 
(
    '20000001-0000-0000-0000-000000000001',
    'HVAC Pro Vancouver',
    ARRAY['HVAC', 'Heating', 'Air Conditioning'],
    ARRAY['Furnace Repair', 'Boiler Maintenance', 'AC Installation'],
    'Mike Chen',
    'mike@hvacprovancouver.com',
    '+1-604-555-1001',
    'https://hvacprovancouver.com',
    '2345 Commercial Drive',
    'Vancouver',
    'BC',
    'V5N 4B4',
    49.2606,
    -123.0695,
    50,
    true,
    true,
    'HVAC-BC-12345',
    '22222222-2222-2222-2222-222222222222',
    'Family-owned HVAC company serving Greater Vancouver for 15 years. Specializing in residential and commercial heating systems.'
),
(
    '20000001-0000-0000-0000-000000000002',
    'Metro Plumbing & Heating',
    ARRAY['Plumbing', 'Heating', 'Water Heaters'],
    ARRAY['Water Heater Installation', 'Boiler Repair', 'Emergency Plumbing'],
    'Tom Wilson',
    'tom@metroplumbing.ca',
    '+1-604-555-1002',
    'https://metroplumbing.ca',
    '567 Fraser Street',
    'Vancouver',
    'BC',
    'V5V 3A2',
    49.2632,
    -123.0783,
    40,
    true,
    true,
    'PLB-BC-67890',
    NULL,
    '24/7 emergency plumbing and heating services. Licensed and insured.'
),
(
    '20000001-0000-0000-0000-000000000003',
    'Burnaby Furnace Experts',
    ARRAY['HVAC', 'Heating'],
    ARRAY['Furnace Installation', 'Heat Pump Service'],
    'Lisa Park',
    'lisa@burnabyfurnace.com',
    '+1-604-555-1003',
    'https://burnabyfurnace.com',
    '4321 Canada Way',
    'Burnaby',
    'BC',
    'V5G 1J3',
    49.2288,
    -123.0008,
    30,
    true,
    true,
    'HVAC-BC-54321',
    NULL,
    'Furnace specialists with factory-certified technicians. Servicing Burnaby and surrounding areas.'
),
(
    '20000001-0000-0000-0000-000000000004',
    'Richmond HVAC Solutions',
    ARRAY['HVAC', 'Air Conditioning', 'Ventilation'],
    ARRAY['Commercial HVAC', 'Industrial Systems', 'Ductwork'],
    'Kevin Lee',
    'kevin@richmondhvac.ca',
    '+1-604-555-1004',
    'https://richmondhvac.ca',
    '8888 River Road',
    'Richmond',
    'BC',
    'V6X 1Y5',
    49.1913,
    -123.1367,
    45,
    false,
    true,
    'HVAC-BC-99999',
    NULL,
    'Commercial and industrial HVAC specialists. Large-scale project experience.'
);

-- Update company location geography points
UPDATE companies 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- PART 4: EQUIPMENT REGISTRY
-- ============================================================================

INSERT INTO equipment_registry (
    id, qr_code, equipment_type, manufacturer, model_number, serial_number,
    install_date, warranty_expiry, property_id, location_details,
    installer_company_id, current_owner_id, privacy_level,
    recommended_service_interval_months, last_service_date, next_service_due,
    is_active, specifications
) VALUES 
-- Smith Residence Equipment
(
    '30000001-0000-0000-0000-000000000001',
    'SSQ-2026-001-ABCD1234',
    'Gas Furnace',
    'Lennox',
    'SLP98V',
    'LNX20240101',
    '2024-01-15',
    '2034-01-15',
    '10000001-0000-0000-0000-000000000001',
    'Basement utility room, southwest corner',
    '20000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'public',
    12,
    '2025-09-15',
    '2026-09-15',
    true,
    '{"btuh": 98000, "efficiency": "98% AFUE", "fuel_type": "Natural Gas", "stages": 2}'::jsonb
),
(
    '30000001-0000-0000-0000-000000000002',
    'SSQ-2026-001-EFGH5678',
    'Water Heater',
    'Rheem',
    'MR50245',
    'RHM20240215',
    '2024-02-20',
    '2030-02-20',
    '10000001-0000-0000-0000-000000000001',
    'Basement utility room, next to furnace',
    '20000001-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'public',
    12,
    '2025-08-20',
    '2026-08-20',
    true,
    '{"capacity_gallons": 50, "fuel_type": "Natural Gas", "recovery_rate": "45 gph", "energy_factor": 0.62}'::jsonb
),

-- Chen Family Home Equipment
(
    '30000001-0000-0000-0000-000000000003',
    'SSQ-2026-002-IJKL9012',
    'Boiler',
    'Weil-McLain',
    'CGa-5',
    'WMC20230901',
    '2023-09-10',
    '2033-09-10',
    '10000001-0000-0000-0000-000000000002',
    'Basement mechanical room, north wall',
    '20000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'private',
    12,
    '2025-10-10',
    '2026-10-10',
    true,
    '{"btuh": 125000, "type": "Cast Iron Gas Boiler", "efficiency": "82% AFUE", "fuel_type": "Natural Gas"}'::jsonb
),
(
    '30000001-0000-0000-0000-000000000004',
    'SSQ-2026-002-MNOP3456',
    'Heat Pump',
    'Carrier',
    'Infinity 20',
    'CAR20240401',
    '2024-04-15',
    '2034-04-15',
    '10000001-0000-0000-0000-000000000002',
    'Backyard, east side of house',
    '20000001-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'public',
    6,
    '2025-11-15',
    '2026-05-15',
    true,
    '{"seer": 20, "hspf": 10, "capacity_tons": 3, "refrigerant": "R-410A", "type": "Air Source Heat Pump"}'::jsonb
),

-- Johnson Townhouse Equipment
(
    '30000001-0000-0000-0000-000000000005',
    'SSQ-2026-003-QRST7890',
    'Gas Furnace',
    'Trane',
    'S9V2',
    'TRN20231101',
    '2023-11-20',
    '2033-11-20',
    '10000001-0000-0000-0000-000000000003',
    'Utility closet, second floor',
    '20000001-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333333',
    'public',
    12,
    '2025-10-20',
    '2026-10-20',
    true,
    '{"btuh": 60000, "efficiency": "96% AFUE", "fuel_type": "Natural Gas", "stages": 2}'::jsonb
),

-- Downtown Office Tower Equipment
(
    '30000001-0000-0000-0000-000000000006',
    'SSQ-2026-004-UVWX1234',
    'Commercial Boiler',
    'Lochinvar',
    'CREST FBN2001',
    'LOC20220301',
    '2022-03-15',
    '2032-03-15',
    '10000001-0000-0000-0000-000000000004',
    'Mechanical penthouse, Unit 1',
    '20000001-0000-0000-0000-000000000004',
    '33333333-3333-3333-3333-333333333333',
    'authorized',
    6,
    '2025-12-15',
    '2026-06-15',
    true,
    '{"btuh": 2001000, "type": "Fire-Tube Condensing Boiler", "efficiency": "95%", "fuel_type": "Natural Gas"}'::jsonb
),
(
    '30000001-0000-0000-0000-000000000007',
    'SSQ-2026-004-YZAB5678',
    'Rooftop AC Unit',
    'York',
    'Predator ZF',
    'YRK20220401',
    '2022-04-20',
    '2032-04-20',
    '10000001-0000-0000-0000-000000000004',
    'Rooftop, south section',
    '20000001-0000-0000-0000-000000000004',
    '33333333-3333-3333-3333-333333333333',
    'authorized',
    4,
    '2025-12-20',
    '2026-04-20',
    true,
    '{"capacity_tons": 25, "cooling_capacity_btuh": 300000, "type": "Package Unit", "refrigerant": "R-410A"}'::jsonb
),

-- Metrotown Shopping Centre Equipment
(
    '30000001-0000-0000-0000-000000000008',
    'SSQ-2026-005-CDEF9012',
    'Commercial Kitchen Exhaust',
    'CaptiveAire',
    'ND1-PSP-16FT',
    'CAP20210601',
    '2021-06-10',
    '2031-06-10',
    '10000001-0000-0000-0000-000000000005',
    'Food court, above cooking stations',
    '20000001-0000-0000-0000-000000000004',
    '33333333-3333-3333-3333-333333333333',
    'private',
    3,
    '2025-11-10',
    '2026-02-10',
    true,
    '{"cfm": 10000, "hood_length_ft": 16, "type": "Type 1 Exhaust Hood", "fire_suppression": "Ansul R-102"}'::jsonb
),
(
    '30000001-0000-0000-0000-000000000009',
    'SSQ-2026-005-GHIJ3456',
    'Walk-in Freezer Unit',
    'Bally',
    'BFF-1014-8',
    'BAL20210701',
    '2021-07-15',
    '2031-07-15',
    '10000001-0000-0000-0000-000000000005',
    'Food court, back storage area',
    '20000001-0000-0000-0000-000000000002',
    '33333333-3333-3333-3333-333333333333',
    'private',
    6,
    '2025-12-15',
    '2026-06-15',
    true,
    '{"size_ft": "10x14x8", "temp_range_f": "-10 to 0", "compressor": "Remote", "refrigerant": "R-404A"}'::jsonb
),

-- Equipment with authorized access (includes access code)
(
    '30000001-0000-0000-0000-000000000010',
    'SSQ-2026-006-KLMN7890',
    'Central Chiller',
    'Trane',
    'CGAM',
    'TRN20200901',
    '2020-09-01',
    '2035-09-01',
    '10000001-0000-0000-0000-000000000004',
    'Basement mechanical room',
    '20000001-0000-0000-0000-000000000004',
    '33333333-3333-3333-3333-333333333333',
    'authorized',
    12,
    '2025-08-01',
    '2026-08-01',
    true,
    '{"capacity_tons": 350, "type": "Air-Cooled Chiller", "refrigerant": "R-134a", "compressor_stages": 2}'::jsonb
);

-- Set access codes for authorized equipment
UPDATE equipment_registry 
SET access_code = '123456' 
WHERE id IN (
    '30000001-0000-0000-0000-000000000006',
    '30000001-0000-0000-0000-000000000007',
    '30000001-0000-0000-0000-000000000010'
);

-- ============================================================================
-- PART 5: SERVICE HISTORY
-- ============================================================================

INSERT INTO service_history (
    id, equipment_id, service_date, service_type, service_description,
    company_id, technician_name, technician_license,
    parts_replaced, labor_hours, parts_cost, labor_cost, currency,
    invoice_number, next_service_recommended, follow_up_notes,
    rating, review, review_date
) VALUES 
-- Smith Residence - Furnace Service
(
    '40000001-0000-0000-0000-000000000001',
    '30000001-0000-0000-0000-000000000001',
    '2024-09-15',
    'Annual Maintenance',
    'Complete furnace inspection and cleaning. Checked heat exchanger, burners, and blower motor. Replaced air filter. All systems operating normally.',
    '20000001-0000-0000-0000-000000000001',
    'Mike Chen',
    'HVAC-BC-12345-T01',
    ARRAY['Air Filter 16x25x1', 'Igniter'],
    2.5,
    45.00,
    250.00,
    'CAD',
    'HVAC-2024-0915',
    '2025-09-15',
    'Furnace in excellent condition. Recommend next service before heating season 2025.',
    5,
    'Mike was professional and thorough. Explained everything clearly. Highly recommend!',
    '2024-09-20 10:30:00-07'
),
(
    '40000001-0000-0000-0000-000000000002',
    '30000001-0000-0000-0000-000000000001',
    '2025-09-15',
    'Annual Maintenance',
    'Annual furnace maintenance performed. Cleaned burners and heat exchanger. Tested safety controls. Replaced air filter. System efficiency at 97%.',
    '20000001-0000-0000-0000-000000000001',
    'Mike Chen',
    'HVAC-BC-12345-T01',
    ARRAY['Air Filter 16x25x1'],
    2.0,
    25.00,
    200.00,
    'CAD',
    'HVAC-2025-0915',
    '2026-09-15',
    'System running perfectly. No issues detected.',
    5,
    'Always reliable service from HVAC Pro Vancouver!',
    '2025-09-18 14:15:00-07'
),

-- Smith Residence - Water Heater Service
(
    '40000001-0000-0000-0000-000000000003',
    '30000001-0000-0000-0000-000000000002',
    '2024-08-20',
    'Annual Maintenance',
    'Water heater flush and inspection. Checked anode rod (30% remaining). Tested TPR valve. Adjusted temperature to 120°F.',
    '20000001-0000-0000-0000-000000000002',
    'Tom Wilson',
    'PLB-BC-67890-T02',
    ARRAY[],
    1.5,
    0.00,
    150.00,
    'CAD',
    'MPH-2024-0820',
    '2025-08-20',
    'Anode rod should be replaced next year to prevent tank corrosion.',
    4,
    'Good service, but appointment was rescheduled once.',
    '2024-08-25 16:00:00-07'
),
(
    '40000001-0000-0000-0000-000000000004',
    '30000001-0000-0000-0000-000000000002',
    '2025-08-20',
    'Annual Maintenance',
    'Annual water heater service. Flushed sediment. Replaced anode rod as recommended. Tested all safety devices. Unit operating efficiently.',
    '20000001-0000-0000-0000-000000000002',
    'Tom Wilson',
    'PLB-BC-67890-T02',
    ARRAY['Anode Rod'],
    2.0,
    85.00,
    180.00,
    'CAD',
    'MPH-2025-0820',
    '2026-08-20',
    'New anode rod installed. Tank should last another 5+ years.',
    5,
    'Tom arrived on time and explained the importance of anode rod replacement. Great work!',
    '2025-08-22 11:00:00-07'
),

-- Chen Family Home - Boiler Service
(
    '40000001-0000-0000-0000-000000000005',
    '30000001-0000-0000-0000-000000000003',
    '2024-10-10',
    'Annual Maintenance',
    'Complete boiler inspection. Cleaned and tested burner assembly. Checked all zone valves and circulators. Tested safety controls. System pressure adjusted.',
    '20000001-0000-0000-0000-000000000001',
    'Mike Chen',
    'HVAC-BC-12345-T01',
    ARRAY['Expansion Tank Air Valve'],
    3.0,
    35.00,
    300.00,
    'CAD',
    'HVAC-2024-1010',
    '2025-10-10',
    'Boiler efficiency at 80%. Minor leak detected at expansion tank - replaced air valve.',
    4,
    'Thorough inspection. Fixed a small issue we didn''t know about.',
    '2024-10-15 09:30:00-07'
),
(
    '40000001-0000-0000-0000-000000000006',
    '30000001-0000-0000-0000-000000000003',
    '2025-10-10',
    'Annual Maintenance',
    'Annual boiler service completed. Combustion analysis performed - efficiency at 81.5%. All zones heating properly. No issues found.',
    '20000001-0000-0000-0000-000000000001',
    'Jennifer Lee',
    'HVAC-BC-12345-T03',
    ARRAY['Filter'],
    2.5,
    20.00,
    275.00,
    'CAD',
    'HVAC-2025-1010',
    '2026-10-10',
    'System in excellent condition. Continue annual maintenance schedule.',
    5,
    'Jennifer was knowledgeable and efficient. Very happy with the service.',
    '2025-10-12 13:45:00-07'
),

-- Chen Family Home - Heat Pump Service
(
    '40000001-0000-0000-0000-000000000007',
    '30000001-0000-0000-0000-000000000004',
    '2025-05-15',
    'Spring Maintenance',
    'Heat pump spring tune-up. Checked refrigerant levels (normal). Cleaned outdoor coil. Tested heating and cooling modes. Lubricated fan motor.',
    '20000001-0000-0000-0000-000000000003',
    'Lisa Park',
    'HVAC-BC-54321-T01',
    ARRAY[],
    2.0,
    0.00,
    220.00,
    'CAD',
    'BFE-2025-0515',
    '2025-11-15',
    'Schedule fall service before heating season. Unit performing excellently.',
    5,
    'Lisa was fantastic! Explained everything in detail and answered all our questions.',
    '2025-05-18 10:00:00-07'
),
(
    '40000001-0000-0000-0000-000000000008',
    '30000001-0000-0000-0000-000000000004',
    '2025-11-15',
    'Fall Maintenance',
    'Heat pump fall inspection. Tested defrost cycle. Checked electrical connections. Cleaned filters. System ready for winter heating.',
    '20000001-0000-0000-0000-000000000003',
    'Lisa Park',
    'HVAC-BC-54321-T01',
    ARRAY['Air Filter Set'],
    1.5,
    45.00,
    195.00,
    'CAD',
    'BFE-2025-1115',
    '2026-05-15',
    'All systems normal. Next spring service recommended.',
    5,
    'Consistent excellent service from Burnaby Furnace Experts!',
    '2025-11-17 15:30:00-08'
),

-- Johnson Townhouse - Furnace Emergency Repair
(
    '40000001-0000-0000-0000-000000000009',
    '30000001-0000-0000-0000-000000000005',
    '2025-01-05',
    'Emergency Repair',
    'Emergency call - no heat. Diagnosed faulty flame sensor. Cleaned sensor and tested - flame detection restored. System operating normally.',
    '20000001-0000-0000-0000-000000000003',
    'Robert Kim',
    'HVAC-BC-54321-T02',
    ARRAY['Flame Sensor'],
    1.5,
    85.00,
    225.00,
    'CAD',
    'BFE-2025-0105-EMRG',
    '2025-10-20',
    'Emergency fee waived due to annual service contract. Recommend annual maintenance.',
    4,
    'Quick response on a Sunday evening. Got our heat back on within an hour!',
    '2025-01-07 12:00:00-08'
),
(
    '40000001-0000-0000-0000-000000000010',
    '30000001-0000-0000-0000-000000000005',
    '2025-10-20',
    'Annual Maintenance',
    'Comprehensive furnace inspection. Checked heat exchanger for cracks (clear). Cleaned burners and flame sensor. Tested all safety controls. System efficiency at 95%.',
    '20000001-0000-0000-0000-000000000003',
    'Lisa Park',
    'HVAC-BC-54321-T01',
    ARRAY['Air Filter', 'Humidifier Pad'],
    2.0,
    55.00,
    210.00,
    'CAD',
    'BFE-2025-1020',
    '2026-10-20',
    'Furnace in excellent condition. Enrolled in annual maintenance plan - saves $50/year.',
    5,
    'Professional service. Love the maintenance plan - peace of mind!',
    '2025-10-22 14:00:00-07'
),

-- Downtown Office Tower - Commercial Boiler
(
    '40000001-0000-0000-0000-000000000011',
    '30000001-0000-0000-0000-000000000006',
    '2025-06-15',
    'Semi-Annual Maintenance',
    'Commercial boiler service. Complete combustion analysis. Cleaned heat exchanger tubes. Tested safety interlocks. Water quality testing performed.',
    '20000001-0000-0000-0000-000000000004',
    'Kevin Lee',
    'HVAC-BC-99999-T01',
    ARRAY['Gasket Set', 'Water Treatment Chemicals'],
    4.0,
    180.00,
    480.00,
    'CAD',
    'RHS-2025-0615-COMM',
    '2025-12-15',
    'Commercial system requires 6-month service intervals. Schedule next service December.',
    NULL,
    NULL,
    NULL
),
(
    '40000001-0000-0000-0000-000000000012',
    '30000001-0000-0000-0000-000000000006',
    '2025-12-15',
    'Semi-Annual Maintenance',
    'Winter boiler inspection. Pressure tested system. Checked expansion tank. Tested low-water cutoff. All zones operational.',
    '20000001-0000-0000-0000-000000000004',
    'Kevin Lee',
    'HVAC-BC-99999-T01',
    ARRAY['Control Valve Actuator'],
    5.0,
    385.00,
    600.00,
    'CAD',
    'RHS-2025-1215-COMM',
    '2026-06-15',
    'Zone 3 actuator showing wear - replaced preventatively. Next service June 2026.',
    NULL,
    NULL,
    NULL
),

-- Downtown Office Tower - Rooftop AC
(
    '40000001-0000-0000-0000-000000000013',
    '30000001-0000-0000-0000-000000000007',
    '2025-04-20',
    'Spring Start-Up',
    'Pre-season AC start-up. Checked refrigerant charge. Tested compressor and condenser fan. Cleaned coils. Verified controls.',
    '20000001-0000-0000-0000-000000000004',
    'David Wong',
    'HVAC-BC-99999-T02',
    ARRAY['Contactor', 'Belt Set'],
    3.5,
    210.00,
    420.00,
    'CAD',
    'RHS-2025-0420-AC',
    '2025-08-20',
    'Replaced worn contactor and belts. Mid-season check recommended.',
    NULL,
    NULL,
    NULL
),
(
    '40000001-0000-0000-0000-000000000014',
    '30000001-0000-0000-0000-000000000007',
    '2025-08-20',
    'Mid-Season Check',
    'Mid-summer AC inspection. Checked refrigerant levels (optimal). Cleaned condenser coils. Verified cooling capacity. No issues found.',
    '20000001-0000-0000-0000-000000000004',
    'David Wong',
    'HVAC-BC-99999-T02',
    ARRAY[],
    2.0,
    0.00,
    240.00,
    'CAD',
    'RHS-2025-0820-AC',
    '2025-12-20',
    'System performing optimally during peak cooling season.',
    NULL,
    NULL,
    NULL
),
(
    '40000001-0000-0000-0000-000000000015',
    '30000001-0000-0000-0000-000000000007',
    '2025-12-20',
    'Fall Shutdown',
    'Winter shutdown procedure. Covered outdoor unit. Drained condensate lines. Verified dampers closed. System secured for winter.',
    '20000001-0000-0000-0000-000000000004',
    'David Wong',
    'HVAC-BC-99999-T02',
    ARRAY[],
    1.5,
    0.00,
    180.00,
    'CAD',
    'RHS-2025-1220-AC',
    '2026-04-20',
    'Schedule spring start-up April 2026.',
    NULL,
    NULL,
    NULL
);

-- ============================================================================
-- PART 6: QR SCAN LOGS (Recent Activity)
-- ============================================================================

INSERT INTO qr_scan_logs (
    equipment_id, scanned_by_user_id, scan_type, ip_address, user_agent, location_latitude, location_longitude
) VALUES 
-- Public scans (homeowners checking their equipment)
(
    '30000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'view_info',
    '192.168.1.100',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    49.2827,
    -123.1207
),
(
    '30000001-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'view_info',
    '192.168.1.100',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    49.2827,
    -123.1207
),

-- Technician scans during service
(
    '30000001-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'service_log',
    '142.58.103.25',
    'Mozilla/5.0 (Linux; Android 13)',
    49.2827,
    -123.1207
),
(
    '30000001-0000-0000-0000-000000000003',
    '22222222-2222-2222-2222-222222222222',
    'service_log',
    '142.58.103.25',
    'Mozilla/5.0 (Linux; Android 13)',
    49.2488,
    -122.9805
),

-- Anonymous public scans (potential customers)
(
    '30000001-0000-0000-0000-000000000004',
    NULL,
    'anonymous_view',
    '24.86.147.92',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    49.2488,
    -122.9805
),
(
    '30000001-0000-0000-0000-000000000005',
    NULL,
    'anonymous_view',
    '70.79.162.44',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    49.1666,
    -123.1336
);

-- ============================================================================
-- PART 7: SERVICE REQUESTS
-- ============================================================================

INSERT INTO service_requests (
    equipment_id, requested_by_user_id, request_type, priority, 
    description, preferred_date, contact_name, contact_email, contact_phone,
    status, notes
) VALUES 
(
    '30000001-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'maintenance',
    'normal',
    'Annual boiler maintenance due. Would like to schedule before winter.',
    '2026-10-01',
    'David Chen',
    'david.chen@example.com',
    '+1-604-555-0102',
    'pending',
    'Customer prefers morning appointments'
),
(
    '30000001-0000-0000-0000-000000000005',
    '33333333-3333-3333-3333-333333333333',
    'maintenance',
    'normal',
    'Regular furnace check-up needed.',
    '2026-09-15',
    'Sarah Johnson',
    'sarah@pmvancouver.com',
    '+1-604-555-0103',
    'pending',
    NULL
),
(
    '30000001-0000-0000-0000-000000000008',
    '33333333-3333-3333-3333-333333333333',
    'maintenance',
    'high',
    'Commercial kitchen exhaust hood quarterly inspection due. Health inspection coming up.',
    '2026-02-01',
    'Facilities Manager',
    'facilities@metrotown.ca',
    '+1-604-555-0201',
    'pending',
    'Must be completed before Feb 10 health inspection'
);

-- ============================================================================
-- PART 8: COMPANY RATINGS
-- ============================================================================

INSERT INTO company_ratings (
    company_id, rated_by_user_id, equipment_id, service_history_id,
    rating, review, response_time_rating, professionalism_rating, value_rating
) VALUES 
(
    '20000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '30000001-0000-0000-0000-000000000001',
    '40000001-0000-0000-0000-000000000001',
    5,
    'HVAC Pro Vancouver has been servicing our furnace for 2 years. Mike is always professional, thorough, and explains everything clearly. Highly recommend!',
    5,
    5,
    5
),
(
    '20000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '30000001-0000-0000-0000-000000000001',
    '40000001-0000-0000-0000-000000000002',
    5,
    'Another excellent service from Mike. They''re always on time and do great work.',
    5,
    5,
    5
),
(
    '20000001-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '30000001-0000-0000-0000-000000000002',
    '40000001-0000-0000-0000-000000000004',
    5,
    'Tom is knowledgeable and explains things well. Saved us from a potential water heater failure by replacing the anode rod.',
    4,
    5,
    5
),
(
    '20000001-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    '30000001-0000-0000-0000-000000000004',
    '40000001-0000-0000-0000-000000000007',
    5,
    'Lisa from Burnaby Furnace Experts is amazing! She takes time to educate customers and does thorough work.',
    5,
    5,
    5
),
(
    '20000001-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333333',
    '30000001-0000-0000-0000-000000000005',
    '40000001-0000-0000-0000-000000000009',
    4,
    'Quick emergency response. Saved us on a cold Sunday night. Only minor complaint was one rescheduled appointment.',
    4,
    5,
    4
);

-- ============================================================================
-- PART 9: HOME HERO SUBSCRIPTION TIERS
-- ============================================================================

INSERT INTO user_subscription_tiers (
    user_id, tier_name, max_equipment, max_properties, is_active
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Home Hero',
    20,
    5,
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    'Pro',
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    'Enterprise',
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    true
);

-- ============================================================================
-- PART 10: QR BATCH TEST DATA (For Home Hero Campaign)
-- ============================================================================

INSERT INTO qr_batches (
    batch_id, batch_name, quantity_generated, purpose, distribution_channel, notes
) VALUES 
(
    'BATCH-2026-001',
    'Home Hero Launch - Emco Vancouver',
    5000,
    'marketing_campaign',
    'Wholesale partner - Emco Vancouver',
    'First batch for Home Hero free sticker campaign. Delivered to Emco Vancouver January 2026.'
),
(
    'BATCH-2026-002',
    'Home Hero Launch - Andrew Sheret Burnaby',
    3000,
    'marketing_campaign',
    'Wholesale partner - Andrew Sheret Burnaby',
    'Second batch for Andrew Sheret. Delivered January 2026.'
),
(
    'BATCH-2026-TEST',
    'Internal Testing Batch',
    100,
    'internal_testing',
    'SnapLabs Team',
    'Test batch for QA and internal use.'
);

-- ============================================================================
-- PART 11: PRE-ACTIVATION QR CODES (Sample from batches)
-- ============================================================================

-- Generate 20 sample pre-activation codes
INSERT INTO pre_activation_qr_codes (
    qr_code, batch_id, activation_url, is_activated
) VALUES 
    ('SSQ-HH-2026-001-0001', 'BATCH-2026-001', 'https://servicesnap.app/activate/SSQ-HH-2026-001-0001', false),
    ('SSQ-HH-2026-001-0002', 'BATCH-2026-001', 'https://servicesnap.app/activate/SSQ-HH-2026-001-0002', false),
    ('SSQ-HH-2026-001-0003', 'BATCH-2026-001', 'https://servicesnap.app/activate/SSQ-HH-2026-001-0003', false),
    ('SSQ-HH-2026-001-0004', 'BATCH-2026-001', 'https://servicesnap.app/activate/SSQ-HH-2026-001-0004', false),
    ('SSQ-HH-2026-001-0005', 'BATCH-2026-001', 'https://servicesnap.app/activate/SSQ-HH-2026-001-0005', false),
    ('SSQ-HH-2026-002-0001', 'BATCH-2026-002', 'https://servicesnap.app/activate/SSQ-HH-2026-002-0001', false),
    ('SSQ-HH-2026-002-0002', 'BATCH-2026-002', 'https://servicesnap.app/activate/SSQ-HH-2026-002-0002', false),
    ('SSQ-HH-2026-002-0003', 'BATCH-2026-002', 'https://servicesnap.app/activate/SSQ-HH-2026-002-0003', false),
    ('SSQ-HH-2026-TEST-0001', 'BATCH-2026-TEST', 'https://servicesnap.app/activate/SSQ-HH-2026-TEST-0001', true), -- Activated
    ('SSQ-HH-2026-TEST-0002', 'BATCH-2026-TEST', 'https://servicesnap.app/activate/SSQ-HH-2026-TEST-0002', true); -- Activated

-- Link activated test codes to equipment (for testing)
UPDATE pre_activation_qr_codes 
SET 
    activated_at = NOW() - INTERVAL '7 days',
    activated_by_user_id = '22222222-2222-2222-2222-222222222222',
    equipment_id = '30000001-0000-0000-0000-000000000001'
WHERE qr_code = 'SSQ-HH-2026-TEST-0001';

UPDATE pre_activation_qr_codes 
SET 
    activated_at = NOW() - INTERVAL '5 days',
    activated_by_user_id = '22222222-2222-2222-2222-222222222222',
    equipment_id = '30000001-0000-0000-0000-000000000002'
WHERE qr_code = 'SSQ-HH-2026-TEST-0002';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Summary counts
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST DATA SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Properties: %', (SELECT COUNT(*) FROM properties);
    RAISE NOTICE 'Companies: %', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE 'Equipment: %', (SELECT COUNT(*) FROM equipment_registry);
    RAISE NOTICE 'Service History: %', (SELECT COUNT(*) FROM service_history);
    RAISE NOTICE 'QR Scan Logs: %', (SELECT COUNT(*) FROM qr_scan_logs);
    RAISE NOTICE 'Service Requests: %', (SELECT COUNT(*) FROM service_requests);
    RAISE NOTICE 'Company Ratings: %', (SELECT COUNT(*) FROM company_ratings);
    RAISE NOTICE 'Subscription Tiers: %', (SELECT COUNT(*) FROM user_subscription_tiers);
    RAISE NOTICE 'QR Batches: %', (SELECT COUNT(*) FROM qr_batches);
    RAISE NOTICE 'Pre-activation Codes: %', (SELECT COUNT(*) FROM pre_activation_qr_codes);
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES FOR PRODUCTION USE
-- ============================================================================

-- 1. REPLACE PLACEHOLDER USER IDS:
--    After creating real users in Supabase Auth, run:
--    UPDATE properties SET owner_id = 'real-uuid' WHERE owner_id = '11111111-1111-1111-1111-111111111111';
--    UPDATE companies SET owner_id = 'real-uuid' WHERE owner_id = '22222222-2222-2222-2222-222222222222';
--    UPDATE equipment_registry SET current_owner_id = 'real-uuid' WHERE current_owner_id = '11111111-1111-1111-1111-111111111111';
--    UPDATE user_subscription_tiers SET user_id = 'real-uuid' WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- 2. GENERATE MORE QR CODES:
--    Use the bulk generation function from the migration:
--    SELECT generate_qr_batch('BATCH-2026-003', 10000, 'wholesale', 'Emco Surrey');

-- 3. TEST SCENARIOS TO VERIFY:
--    a. Nearby company search
--    b. Equipment activation flow
--    c. Service history timeline
--    d. Privacy levels (public/private/authorized)
--    e. Subscription limits
--    f. QR code scanning
--    g. Rating and review system

-- 4. PERFORMANCE TESTING:
--    All indexes are in place. Test queries with EXPLAIN ANALYZE.

-- ============================================================================
