ALTER TABLE public.meta_leads
ADD COLUMN IF NOT EXISTS assignment_viewed_at timestamptz;
