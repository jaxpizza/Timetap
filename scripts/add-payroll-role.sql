-- Update the role check constraint to include 'payroll'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'payroll', 'manager', 'employee'));

-- Admin or owner only
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Payroll role or above (owner/admin/payroll) — can view timesheets, run payroll
CREATE OR REPLACE FUNCTION public.is_payroll_or_above()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin', 'payroll')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Manager role or above (owner/admin/manager) — NOTE: payroll is NOT included here.
-- Payroll role does not manage scheduling or PTO.
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
