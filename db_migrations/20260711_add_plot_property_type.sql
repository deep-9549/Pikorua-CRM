-- Allow Excel inventory rows marked as Plots to remain typed as plot inventory.

ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'plot';

UPDATE public.properties
SET type = 'plot'
WHERE lower(name) IN ('kalrav alpines', 'westpark')
  AND type <> 'plot';
