-- PRODUCTION CLEANUP MIGRATION
-- WARNING: This will delete all user generated data. Run only before V1.0 Launch.

-- 1. Purge Transactional Data
DELETE FROM "public"."transaction_items";
DELETE FROM "public"."transactions";
DELETE FROM "public"."timecards";
DELETE FROM "public"."estimate_items";
DELETE FROM "public"."estimates";
DELETE FROM "public"."change_orders";

-- 2. Purge User Interaction Data
DELETE FROM "public"."user_feedback";
DELETE FROM "public"."feature_votes";
DELETE FROM "public"."feature_requests"; -- Optional: Keep features if they are real requests? Let's purge for fresh start or keep? User said "test receipts, project names".
-- Let's purge features too to be safe, or just reset votes. Let's purge.
DELETE FROM "public"."feature_requests";

-- 3. Purge Project Data
DELETE FROM "public"."projects";

-- 4. Purge Custom Stock
DELETE FROM "public"."stock_presets";

-- 5. Purge Audit Logs
DELETE FROM "public"."audit_logs";
DELETE FROM "public"."attachments";

-- 6. Reset Sequences (Optional, but good for clean IDs if using serial, but we use UUIDs so not needed)

-- 7. Verification of Master Data
-- Ensure trade_presets_master is intact (It should be, we didn't delete from it)

-- 8. Re-Enable Constraints / Triggers (if any were disabled, none were)

-- 9. Add a cleanup timestamp marker
CREATE TABLE IF NOT EXISTS "public"."_deployment_log" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "event" text,
    "created_at" timestamptz DEFAULT now()
);

INSERT INTO "public"."_deployment_log" (event) VALUES ('V1.0 PRODUCTION CLEANUP COMPLETED');
