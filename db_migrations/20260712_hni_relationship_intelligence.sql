CREATE TABLE IF NOT EXISTS hni_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
  category text NOT NULL DEFAULT 'business', designation text, organisation text,
  city text, country text DEFAULT 'India', phone text, email text,
  assistant_name text, assistant_phone text, tier text NOT NULL DEFAULT 'platinum',
  relationship_stage text NOT NULL DEFAULT 'prospect',
  relationship_owner_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  estimated_portfolio_value numeric(18,2), estimated_budget_min numeric(18,2),
  estimated_budget_max numeric(18,2), properties_owned integer NOT NULL DEFAULT 0,
  preferences jsonb NOT NULL DEFAULT '[]'::jsonb, interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  communication_preferences text, relationship_notes text, source text,
  last_contact_at timestamptz, next_action_at timestamptz, next_action text,
  is_sensitive boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS hni_profiles_name_idx ON hni_profiles(full_name);
CREATE INDEX IF NOT EXISTS hni_profiles_owner_idx ON hni_profiles(relationship_owner_id);
CREATE INDEX IF NOT EXISTS hni_profiles_next_action_idx ON hni_profiles(next_action_at);

CREATE TABLE IF NOT EXISTS hni_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hni_profile_id uuid NOT NULL REFERENCES hni_profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL, title text NOT NULL, notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hni_activities_profile_idx ON hni_activities(hni_profile_id, occurred_at DESC);
