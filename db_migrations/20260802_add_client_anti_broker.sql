ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS anti_broker boolean NOT NULL DEFAULT false;
