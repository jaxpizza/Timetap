-- Add invite code to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Generate invite codes for existing orgs
UPDATE organizations SET invite_code = upper(substring(replace(name, ' ', '') from 1 for 4)) || '-' || upper(substring(md5(random()::text) from 1 for 4)) WHERE invite_code IS NULL;

-- Add pending status to profiles for approval queue
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_status text DEFAULT 'active' CHECK (join_status IN ('pending', 'active', 'rejected'));

-- Create index for quick pending lookups
CREATE INDEX IF NOT EXISTS idx_profiles_join_status ON profiles (organization_id, join_status);
