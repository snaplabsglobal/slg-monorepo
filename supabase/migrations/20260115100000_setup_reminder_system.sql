CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "org_id" uuid NOT NULL REFERENCES public.organizations(id),
    "type" TEXT NOT NULL, -- 'payroll', 'gst', 't4', 'corporate_tax'
    "title" TEXT NOT NULL,
    "content" TEXT,
    "due_date" DATE NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their org's notifications" ON public.notifications 
FOR SELECT USING (org_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
