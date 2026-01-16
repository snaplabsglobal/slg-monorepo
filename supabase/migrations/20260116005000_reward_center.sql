-- [1] Reward Settings Table
CREATE TABLE IF NOT EXISTS "public"."reward_settings" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "org_id" uuid REFERENCES auth.users(id),
    "referral_bonus_amount" numeric DEFAULT 50.00,
    "bonus_type" TEXT DEFAULT 'gift_card', -- gift_card, cash, credit
    "trigger_event" TEXT DEFAULT 'contract_signed', -- when the bonus is valid
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- [2] Referrals Tracking Table
CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "referrer_id" uuid REFERENCES auth.users(id), -- Existing client/user
    "referred_email" TEXT,                        -- New lead
    "status" TEXT DEFAULT 'pending',              -- pending, converted, rewarded
    "reward_issued_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."reward_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;

-- Policies for Reward Settings
-- Owner can view/edit their own settings
CREATE POLICY "Owners can view own reward settings" ON "public"."reward_settings"
FOR SELECT USING (auth.uid() = org_id);

CREATE POLICY "Owners can update own reward settings" ON "public"."reward_settings"
FOR UPDATE USING (auth.uid() = org_id);

CREATE POLICY "Owners can insert own reward settings" ON "public"."reward_settings"
FOR INSERT WITH CHECK (auth.uid() = org_id);

-- Policies for Referrals
-- Referrers can see their own referrals
CREATE POLICY "Users can view own referrals" ON "public"."referrals"
FOR SELECT USING (auth.uid() = referrer_id);

-- Referrers can create new referrals
CREATE POLICY "Users can insert referrals" ON "public"."referrals"
FOR INSERT WITH CHECK (auth.uid() = referrer_id);
