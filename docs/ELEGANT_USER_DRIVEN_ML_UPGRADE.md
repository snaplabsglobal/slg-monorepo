# Elegant User-Driven ML Upgrade

Implementation of [claude/ELEGANT_USER_DRIVEN_ML.md](../claude/ELEGANT_USER_DRIVEN_ML.md): no hardcoded rules, user-driven learning, global patterns, location context.

## Summary

1. **DB (migration `20260131000000_elegant_user_driven_ml.sql`)**
   - `ml_training_data.location_region` (optional) – region/timezone for context.
   - `vendor_date_patterns.location_region` (optional).
   - New table `vendor_patterns`: `organization_id`, `vendor_name`, `field_name`, `pattern_value` (JSONB), `correction_count`, `location_region`, `is_active` (10+ corrections). Used for all corrected fields (vendor_name, category_user, etc.), not only date.
   - `record_ml_correction` extended with `p_location_region`; writes `location_region` into `ml_training_data`; upserts `vendor_date_patterns` for date (with location_region); upserts `vendor_patterns` for every other corrected field (vendor_name, category_user, total_amount, …). Auto-activate at 10 corrections (`is_active` / `is_default_rule`).

2. **API**
   - `POST /api/ml/correction`: accepts `locationRegion` / `location_region` / `locationContext`, passes to RPC.
   - `GET /api/ml/vendor-patterns`: returns `fieldPatterns[]` from `vendor_patterns` (all fields for vendor). Handles missing `vendor_patterns` table.
   - `GET /api/ml/stats`: SLG dashboard – total corrections count, recent corrections, date patterns, field patterns. Handles missing `vendor_patterns`.

3. **Frontend**
   - `recordCorrection` in `ml-correction.ts`: new optional `locationContext`; sent as `locationRegion` to the API.
   - `TransactionDataForm`: sends `locationContext = Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g. `America/Vancouver`) when recording a correction.

4. **Analyze (pre-scan rules + flag suspicious)**
   - After Gemini, fetch `vendor_preset_rules` and (if no preset) `vendor_date_patterns` for the extracted vendor.
   - If a preset or org date pattern exists with `date_format`/`year_century`, normalize `transaction_date` with `parseDateWithFormat` and use that in the update.
   - If the normalized date differs from the raw extraction, set `needsReviewFromRule = true` (flag suspicious even at 99%).
   - `needs_review` includes `needsReviewFromRule`.

5. **SLG dashboard**
   - **Page**: `/dashboard/ml` – “AI Learning” monitoring.
   - **API**: `GET /api/ml/stats` – corrections count, recent corrections, date patterns, field patterns.
   - **Entry**: Settings page has “Open ML monitoring” link to `/dashboard/ml`.

## Apply migration

```bash
cd /home/pxjiang/slg-monorepo
pnpm supabase db push
# or
npx supabase migration up
```

## Principles (from doc)

- No hardcoded rules; users teach the system.
- Monitor all field edits (date, vendor, amount, category, …).
- Record with location context (timezone/region).
- Aggregate into patterns; auto-activate at 10 corrections.
- Apply learned rules during receipt analysis; flag suspicious when extraction disagrees with a rule.
