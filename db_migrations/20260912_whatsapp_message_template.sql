-- Per-user WhatsApp thank-you template.
--
-- Each sales executive writes their own greeting once (it carries their name and
-- their own number), and the lead-level "WhatsApp" button pre-fills WhatsApp Web
-- with it. Stored per user rather than globally because the message is signed by
-- whoever sends it.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_template text;
