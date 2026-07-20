BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE meta_leads
  ADD COLUMN IF NOT EXISTS platform text;

-- Preserve a small, stable reporting vocabulary even when historical payloads
-- use Meta's short values (ig/fb) or the full platform names.
UPDATE meta_leads
SET platform = CASE lower(trim(COALESCE(
  form_data->>'platform',
  (
    SELECT field->'values'->>0
    FROM jsonb_array_elements(COALESCE(form_data->'field_data', '[]'::jsonb)) AS field
    WHERE field->>'name' = 'platform'
    LIMIT 1
  )
)))
  WHEN 'ig' THEN 'instagram'
  WHEN 'instagram' THEN 'instagram'
  WHEN 'fb' THEN 'facebook'
  WHEN 'facebook' THEN 'facebook'
  ELSE NULL
END
WHERE platform IS NULL
  AND form_data IS NOT NULL;

CREATE INDEX IF NOT EXISTS meta_leads_platform_idx
  ON meta_leads (platform);

COMMIT;
