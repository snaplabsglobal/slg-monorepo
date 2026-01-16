-- [1] Add 'action_type' to task_resources
ALTER TABLE public.task_resources 
ADD COLUMN IF NOT EXISTS "action_type" TEXT DEFAULT 'bring'; -- 'bring' (existing tool/material), 'buy' (needs purchasing)

-- [2] Create Shopping List View
-- Optimized view for frontend to render purchasing needs directly
CREATE OR REPLACE VIEW public.task_shopping_list AS
SELECT 
    tr.id as resource_id,       -- Added ID for frontend key interaction
    t.title as task_name,
    p.name as project_name,
    tr.item_name,
    tr.item_type,               -- Added item_type for context (tool vs material)
    tr.is_ready,
    t.assigned_to,              -- Added assignee context
    p.id as project_id          -- Added project_id for filtering
FROM public.task_resources tr
JOIN public.tasks t ON tr.task_id = t.id
JOIN public.projects p ON t.project_id = p.id
WHERE tr.action_type = 'buy';
