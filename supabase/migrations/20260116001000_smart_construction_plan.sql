-- [1] Tasks Table: Linked to Projects
CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES public.projects(id),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMPTZ,
    "assigned_to" uuid REFERENCES auth.users(id),
    "status" TEXT DEFAULT 'todo', -- todo, in_progress, done
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

-- [2] Smart Templates Table: System Knowledge Base
CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "task_keyword" TEXT UNIQUE, -- e.g., 'bathtub-demo', 'plumbing-rough-in'
    "suggested_tools" TEXT[],   -- e.g., ['Sledgehammer', 'Reciprocating saw', 'Crowbar']
    "suggested_materials" TEXT[] -- e.g., ['Dump bags', 'Plug caps']
);

-- [3] Real-time Resource List
CREATE TABLE IF NOT EXISTS "public"."task_resources" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "task_id" uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    "item_name" TEXT,
    "item_type" TEXT, -- 'tool' or 'material'
    "is_ready" BOOLEAN DEFAULT false -- Whether it's packed/bought
);

-- Enable RLS (Best Practice)
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_resources" ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Open for internal team for now, refine later)
CREATE POLICY "Enable all access for authenticated users" ON "public"."tasks" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read for authenticated users" ON "public"."task_templates" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON "public"."task_resources" FOR ALL USING (auth.role() = 'authenticated');
