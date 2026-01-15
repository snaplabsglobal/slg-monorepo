-- [1] 更新组织的订阅层级约束
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_plan_check 
CHECK (plan IN ('JSS Base', 'Team', 'Enterprise', 'Free'));

-- [2] 在通知表中增加优先级，高阶会员享受更频繁的提醒（短信/邮件）
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'normal'; 
