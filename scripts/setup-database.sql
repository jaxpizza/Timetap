-- ============================================================
-- TimeTap — Complete Database Schema
-- Run this entire file in the Supabase SQL Editor in one shot.
-- ============================================================

-- ===================
-- 1. EXTENSIONS
-- ===================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================
-- 2. TABLES
-- ===================

-- 1. organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  logo_url text,
  timezone text DEFAULT 'America/Chicago',
  pay_period_type text DEFAULT 'biweekly' CHECK (pay_period_type IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  pay_period_start_day int DEFAULT 1,
  overtime_threshold_weekly numeric DEFAULT 40,
  overtime_multiplier numeric DEFAULT 1.5,
  double_overtime_threshold numeric,
  double_overtime_multiplier numeric DEFAULT 2.0,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. locations
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#4F46E5',
  location_id uuid REFERENCES public.locations ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  display_name text GENERATED ALWAYS AS (coalesce(first_name, '') || ' ' || coalesce(last_name, '')) STORED,
  avatar_url text,
  phone text,
  role text DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'manager', 'employee')),
  department_id uuid REFERENCES public.departments ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations ON DELETE SET NULL,
  hire_date date,
  filing_status text DEFAULT 'single' CHECK (filing_status IN ('single', 'married_joint', 'married_separate', 'head_of_household')),
  federal_allowances int DEFAULT 0,
  state_allowances int DEFAULT 0,
  additional_withholding_federal numeric DEFAULT 0,
  additional_withholding_state numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. pay_rates
CREATE TABLE public.pay_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'hourly' CHECK (type IN ('hourly', 'salary')),
  rate numeric NOT NULL,
  label text DEFAULT 'Regular',
  is_primary boolean DEFAULT true,
  effective_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- 6. time_entries
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  clock_in_method text DEFAULT 'manual',
  clock_out_method text,
  is_split_shift boolean DEFAULT false,
  total_break_minutes int DEFAULT 0,
  total_hours numeric,
  is_overtime boolean DEFAULT false,
  overtime_hours numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'approved', 'flagged', 'edited')),
  approved_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  location_id uuid REFERENCES public.locations ON DELETE SET NULL,
  offline_synced boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. breaks
CREATE TABLE public.breaks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_entry_id uuid REFERENCES public.time_entries ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes numeric,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 8. pay_periods
CREATE TABLE public.pay_periods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'locked', 'processing', 'completed')),
  locked_at timestamptz,
  processed_at timestamptz,
  processed_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  total_hours numeric,
  total_overtime_hours numeric,
  total_gross_pay numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 9. payroll_entries
CREATE TABLE public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_period_id uuid REFERENCES public.pay_periods ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  regular_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  double_overtime_hours numeric DEFAULT 0,
  regular_rate numeric,
  overtime_rate numeric,
  double_overtime_rate numeric,
  regular_pay numeric DEFAULT 0,
  overtime_pay numeric DEFAULT 0,
  double_overtime_pay numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  bonus_note text,
  deduction_note text,
  gross_pay numeric DEFAULT 0,
  federal_income_tax numeric DEFAULT 0,
  state_income_tax numeric DEFAULT 0,
  social_security_tax numeric DEFAULT 0,
  medicare_tax numeric DEFAULT 0,
  federal_unemployment_tax numeric DEFAULT 0,
  state_unemployment_tax numeric DEFAULT 0,
  total_tax numeric DEFAULT 0,
  net_pay numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at timestamptz DEFAULT now()
);

-- 10. pto_policies
CREATE TABLE public.pto_policies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  accrual_rate numeric NOT NULL,
  max_balance numeric,
  max_carryover numeric,
  color text DEFAULT '#14B8A6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 11. pto_balances
CREATE TABLE public.pto_balances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  pto_policy_id uuid REFERENCES public.pto_policies ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  balance_hours numeric DEFAULT 0,
  used_hours numeric DEFAULT 0,
  pending_hours numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, pto_policy_id)
);

-- 12. pto_requests
CREATE TABLE public.pto_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  pto_policy_id uuid REFERENCES public.pto_policies ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_hours numeric NOT NULL,
  note text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now()
);

-- 13. schedules
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 14. shift_swap_requests
CREATE TABLE public.shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  schedule_id uuid REFERENCES public.schedules ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  claimant_id uuid REFERENCES public.profiles ON DELETE SET NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'approved', 'denied', 'cancelled')),
  reason text,
  reviewed_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 15. edit_requests
CREATE TABLE public.edit_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_entry_id uuid REFERENCES public.time_entries ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  requested_clock_in timestamptz,
  requested_clock_out timestamptz,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES public.profiles ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now()
);

-- 16. announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  location_id uuid REFERENCES public.locations ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 17. audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- 18. notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES public.organizations ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ===================
-- 3. TRIGGER FUNCTIONS & TRIGGERS
-- ===================

-- a) update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_time_entries
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_schedules
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- b) calculate_time_entry_hours
CREATE OR REPLACE FUNCTION public.calculate_time_entry_hours()
RETURNS trigger AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours = ROUND(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0
      - COALESCE(NEW.total_break_minutes, 0) / 60.0,
      2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hours_on_time_entry
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_time_entry_hours();

-- c) handle_break_completion
CREATE OR REPLACE FUNCTION public.handle_break_completion()
RETURNS trigger AS $$
DECLARE
  v_duration numeric;
BEGIN
  IF NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR OLD.end_time IS DISTINCT FROM NEW.end_time) THEN
    v_duration := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60.0, 2);

    UPDATE public.breaks
    SET duration_minutes = v_duration
    WHERE id = NEW.id;

    UPDATE public.time_entries
    SET total_break_minutes = (
      SELECT COALESCE(SUM(duration_minutes), 0)::int
      FROM public.breaks
      WHERE time_entry_id = NEW.time_entry_id AND end_time IS NOT NULL
    )
    WHERE id = NEW.time_entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_break_completion_trigger
  AFTER UPDATE ON public.breaks
  FOR EACH ROW EXECUTE FUNCTION public.handle_break_completion();

-- d) handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'employee'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- 4. RLS HELPER FUNCTIONS
-- ===================

CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===================
-- 5. ENABLE RLS ON ALL TABLES
-- ===================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ===================
-- 6. RLS POLICIES (depends on helper functions above)
-- ===================

-- organizations
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (auth.uid() IS NOT NULL AND (id = public.auth_org_id() OR owner_id = auth.uid()));

CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR organization_id = public.auth_org_id());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- time_entries
CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT USING (profile_id = auth.uid() OR (public.is_manager_or_above() AND organization_id = public.auth_org_id()));

CREATE POLICY "time_entries_insert" ON public.time_entries
  FOR INSERT WITH CHECK (profile_id = auth.uid() AND organization_id = public.auth_org_id());

CREATE POLICY "time_entries_update" ON public.time_entries
  FOR UPDATE USING (
    (profile_id = auth.uid() AND status = 'active')
    OR (public.is_manager_or_above() AND organization_id = public.auth_org_id())
  );

-- breaks
CREATE POLICY "breaks_select" ON public.breaks
  FOR SELECT USING (
    profile_id = auth.uid()
    OR (public.is_manager_or_above() AND (SELECT organization_id FROM public.time_entries WHERE id = time_entry_id) = public.auth_org_id())
  );

CREATE POLICY "breaks_insert" ON public.breaks
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "breaks_update" ON public.breaks
  FOR UPDATE USING (profile_id = auth.uid() OR public.is_manager_or_above());

-- locations
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- departments
CREATE POLICY "departments_select" ON public.departments
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "departments_insert" ON public.departments
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "departments_update" ON public.departments
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- pay_rates
CREATE POLICY "pay_rates_select" ON public.pay_rates
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "pay_rates_insert" ON public.pay_rates
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "pay_rates_update" ON public.pay_rates
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- pay_periods
CREATE POLICY "pay_periods_select" ON public.pay_periods
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "pay_periods_insert" ON public.pay_periods
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "pay_periods_update" ON public.pay_periods
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- payroll_entries
CREATE POLICY "payroll_entries_select" ON public.payroll_entries
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "payroll_entries_insert" ON public.payroll_entries
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "payroll_entries_update" ON public.payroll_entries
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- pto_policies
CREATE POLICY "pto_policies_select" ON public.pto_policies
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "pto_policies_insert" ON public.pto_policies
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "pto_policies_update" ON public.pto_policies
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- pto_balances
CREATE POLICY "pto_balances_select" ON public.pto_balances
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "pto_balances_insert" ON public.pto_balances
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "pto_balances_update" ON public.pto_balances
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- pto_requests
CREATE POLICY "pto_requests_select" ON public.pto_requests
  FOR SELECT USING (profile_id = auth.uid() OR (public.is_manager_or_above() AND organization_id = public.auth_org_id()));

CREATE POLICY "pto_requests_insert" ON public.pto_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid() AND organization_id = public.auth_org_id());

CREATE POLICY "pto_requests_update" ON public.pto_requests
  FOR UPDATE USING (public.is_manager_or_above() AND organization_id = public.auth_org_id());

-- schedules
CREATE POLICY "schedules_select" ON public.schedules
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "schedules_insert" ON public.schedules
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "schedules_update" ON public.schedules
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- shift_swap_requests
CREATE POLICY "shift_swap_requests_select" ON public.shift_swap_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR claimant_id = auth.uid()
    OR (public.is_manager_or_above() AND organization_id = public.auth_org_id())
  );

CREATE POLICY "shift_swap_requests_insert" ON public.shift_swap_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid() AND organization_id = public.auth_org_id());

CREATE POLICY "shift_swap_requests_update" ON public.shift_swap_requests
  FOR UPDATE USING (
    requester_id = auth.uid()
    OR claimant_id = auth.uid()
    OR (public.is_manager_or_above() AND organization_id = public.auth_org_id())
  );

-- edit_requests
CREATE POLICY "edit_requests_select" ON public.edit_requests
  FOR SELECT USING (profile_id = auth.uid() OR (public.is_manager_or_above() AND organization_id = public.auth_org_id()));

CREATE POLICY "edit_requests_insert" ON public.edit_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid() AND organization_id = public.auth_org_id());

CREATE POLICY "edit_requests_update" ON public.edit_requests
  FOR UPDATE USING (public.is_manager_or_above() AND organization_id = public.auth_org_id());

-- announcements
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (organization_id = public.auth_org_id());

CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id() AND public.is_manager_or_above());

CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE USING (organization_id = public.auth_org_id() AND public.is_manager_or_above());

-- audit_log
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (organization_id = public.auth_org_id() AND public.is_admin_or_owner());

CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (organization_id = public.auth_org_id());

-- notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (profile_id = auth.uid());

-- ===================
-- 7. INDEXES
-- ===================

-- organization_id indexes
CREATE INDEX idx_locations_org ON public.locations (organization_id);
CREATE INDEX idx_departments_org ON public.departments (organization_id);
CREATE INDEX idx_profiles_org ON public.profiles (organization_id);
CREATE INDEX idx_pay_rates_org ON public.pay_rates (organization_id);
CREATE INDEX idx_time_entries_org ON public.time_entries (organization_id);
CREATE INDEX idx_pay_periods_org ON public.pay_periods (organization_id);
CREATE INDEX idx_payroll_entries_org ON public.payroll_entries (organization_id);
CREATE INDEX idx_pto_policies_org ON public.pto_policies (organization_id);
CREATE INDEX idx_pto_balances_org ON public.pto_balances (organization_id);
CREATE INDEX idx_pto_requests_org ON public.pto_requests (organization_id);
CREATE INDEX idx_schedules_org ON public.schedules (organization_id);
CREATE INDEX idx_shift_swap_requests_org ON public.shift_swap_requests (organization_id);
CREATE INDEX idx_edit_requests_org ON public.edit_requests (organization_id);
CREATE INDEX idx_announcements_org ON public.announcements (organization_id);
CREATE INDEX idx_audit_log_org ON public.audit_log (organization_id);
CREATE INDEX idx_notifications_org ON public.notifications (organization_id);

-- profile_id indexes
CREATE INDEX idx_pay_rates_profile ON public.pay_rates (profile_id);
CREATE INDEX idx_time_entries_profile ON public.time_entries (profile_id);
CREATE INDEX idx_breaks_profile ON public.breaks (profile_id);
CREATE INDEX idx_pto_balances_profile ON public.pto_balances (profile_id);
CREATE INDEX idx_pto_requests_profile ON public.pto_requests (profile_id);
CREATE INDEX idx_schedules_profile ON public.schedules (profile_id);
CREATE INDEX idx_edit_requests_profile ON public.edit_requests (profile_id);
CREATE INDEX idx_notifications_profile ON public.notifications (profile_id);

-- breaks via time_entry_id
CREATE INDEX idx_breaks_time_entry ON public.breaks (time_entry_id);

-- composite / special indexes
CREATE INDEX idx_time_entries_org_clock_in ON public.time_entries (organization_id, clock_in);
CREATE INDEX idx_schedules_org_start ON public.schedules (organization_id, start_time);
CREATE INDEX idx_notifications_profile_read ON public.notifications (profile_id, is_read);
CREATE INDEX idx_audit_log_org_created ON public.audit_log (organization_id, created_at);
CREATE INDEX idx_pay_periods_org_start ON public.pay_periods (organization_id, start_date);

-- ===================
-- 8. REALTIME
-- ===================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
