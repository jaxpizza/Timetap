-- Temporary job sites table
CREATE TABLE IF NOT EXISTS public.job_sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  radius_meters numeric DEFAULT 121.92, -- 400 feet in meters
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_sites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "job_sites_select" ON public.job_sites
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "job_sites_insert" ON public.job_sites
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "job_sites_update" ON public.job_sites
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "job_sites_delete" ON public.job_sites
  FOR DELETE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- Indexes
CREATE INDEX idx_job_sites_org ON public.job_sites (organization_id);
CREATE INDEX idx_job_sites_active ON public.job_sites (organization_id, is_active, expires_at);
