-- Add job_sites_enabled toggle to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS job_sites_enabled boolean DEFAULT false;
