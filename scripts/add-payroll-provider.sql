-- Add payroll_provider to the role check
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'payroll', 'payroll_provider', 'manager', 'employee'));

-- Junction table linking payroll providers to multiple orgs
CREATE TABLE IF NOT EXISTS public.payroll_provider_orgs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  approved_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.payroll_provider_orgs ENABLE ROW LEVEL SECURITY;

-- Policies: providers can see their own links, org admins can see links to their org
CREATE POLICY "ppo_select_provider" ON public.payroll_provider_orgs
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "ppo_select_org" ON public.payroll_provider_orgs
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "ppo_insert" ON public.payroll_provider_orgs
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "ppo_update" ON public.payroll_provider_orgs
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_admin_or_owner());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ppo_provider ON public.payroll_provider_orgs (provider_id);
CREATE INDEX IF NOT EXISTS idx_ppo_org ON public.payroll_provider_orgs (organization_id);
CREATE INDEX IF NOT EXISTS idx_ppo_status ON public.payroll_provider_orgs (provider_id, status);
