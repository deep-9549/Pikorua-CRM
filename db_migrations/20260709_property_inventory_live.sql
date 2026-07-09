-- Property inventory fields needed by the live /properties section and Excel import.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS relevance text,
  ADD COLUMN IF NOT EXISTS sample_house boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tower_count integer,
  ADD COLUMN IF NOT EXISTS storeys text,
  ADD COLUMN IF NOT EXISTS total_units text,
  ADD COLUMN IF NOT EXISTS units_per_floor text,
  ADD COLUMN IF NOT EXISTS specifications text,
  ADD COLUMN IF NOT EXISTS plot_size jsonb,
  ADD COLUMN IF NOT EXISTS unit_configurations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_sheet text;

UPDATE public.properties
SET unit_configurations = '[]'::jsonb
WHERE unit_configurations IS NULL;

CREATE INDEX IF NOT EXISTS properties_live_inventory_lookup_idx
  ON public.properties (
    tenant_id,
    lower(name),
    lower(coalesce(developer, ''))
  )
  WHERE deleted_at IS NULL;
