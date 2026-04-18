// ============================================================
// TimeTap — Database TypeScript Types
// ============================================================

// ---------- Enums / Union Types ----------

export type UserRole = "owner" | "admin" | "payroll" | "payroll_provider" | "manager" | "employee";
export type PayrollProviderOrgStatus = "pending" | "active" | "revoked";

export interface PayrollProviderOrg {
  id: string;
  provider_id: string;
  organization_id: string;
  status: PayrollProviderOrgStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PayrollProviderOrgInsert {
  provider_id: string;
  organization_id: string;
  status?: PayrollProviderOrgStatus;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface PayrollProviderOrgUpdate {
  status?: PayrollProviderOrgStatus;
  approved_by?: string | null;
  approved_at?: string | null;
}
export type PayPeriodType = "weekly" | "biweekly" | "semimonthly" | "monthly";
export type SubscriptionTier = "free" | "pro" | "enterprise";
export type PayRateType = "hourly" | "salary";
export type TimeEntryStatus = "active" | "completed" | "approved" | "flagged" | "edited";
export type PayPeriodStatus = "open" | "locked" | "processing" | "completed";
export type PayrollEntryStatus = "pending" | "approved" | "paid";
export type PtoRequestStatus = "pending" | "approved" | "denied" | "cancelled";
export type EditRequestStatus = "pending" | "approved" | "denied";
export type ShiftSwapStatus = "open" | "claimed" | "approved" | "denied" | "cancelled";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type FilingStatus = "single" | "married_joint" | "married_separate" | "head_of_household";

// ---------- Row Types ----------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  timezone: string;
  pay_period_type: PayPeriodType;
  pay_period_start_day: number;
  overtime_threshold_weekly: number;
  overtime_multiplier: number;
  double_overtime_threshold: number | null;
  double_overtime_multiplier: number;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  location_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  department_id: string | null;
  location_id: string | null;
  hire_date: string | null;
  filing_status: FilingStatus;
  federal_allowances: number;
  state_allowances: number;
  additional_withholding_federal: number;
  additional_withholding_state: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayRate {
  id: string;
  profile_id: string;
  organization_id: string;
  type: PayRateType;
  rate: number;
  label: string;
  is_primary: boolean;
  effective_date: string;
  end_date: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  profile_id: string;
  organization_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_method: string;
  clock_out_method: string | null;
  is_split_shift: boolean;
  total_break_minutes: number;
  total_hours: number | null;
  is_overtime: boolean;
  overtime_hours: number;
  status: TimeEntryStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  location_id: string | null;
  offline_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface Break {
  id: string;
  time_entry_id: string;
  profile_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_paid: boolean;
  created_at: string;
}

export interface PayPeriod {
  id: string;
  organization_id: string;
  start_date: string;
  end_date: string;
  status: PayPeriodStatus;
  locked_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  total_hours: number | null;
  total_overtime_hours: number | null;
  total_gross_pay: number | null;
  notes: string | null;
  created_at: string;
}

export interface PayrollEntry {
  id: string;
  pay_period_id: string;
  profile_id: string;
  organization_id: string;
  regular_hours: number;
  overtime_hours: number;
  double_overtime_hours: number;
  regular_rate: number | null;
  overtime_rate: number | null;
  double_overtime_rate: number | null;
  regular_pay: number;
  overtime_pay: number;
  double_overtime_pay: number;
  bonus: number;
  deductions: number;
  bonus_note: string | null;
  deduction_note: string | null;
  gross_pay: number;
  federal_income_tax: number;
  state_income_tax: number;
  social_security_tax: number;
  medicare_tax: number;
  federal_unemployment_tax: number;
  state_unemployment_tax: number;
  total_tax: number;
  net_pay: number;
  status: PayrollEntryStatus;
  created_at: string;
}

export interface PtoPolicy {
  id: string;
  organization_id: string;
  name: string;
  accrual_rate: number;
  max_balance: number | null;
  max_carryover: number | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface PtoBalance {
  id: string;
  profile_id: string;
  pto_policy_id: string;
  organization_id: string;
  balance_hours: number;
  used_hours: number;
  pending_hours: number;
  updated_at: string;
}

export interface PtoRequest {
  id: string;
  profile_id: string;
  organization_id: string;
  pto_policy_id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  note: string | null;
  status: PtoRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  organization_id: string;
  profile_id: string;
  location_id: string | null;
  department_id: string | null;
  start_time: string;
  end_time: string;
  is_published: boolean;
  published_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequest {
  id: string;
  organization_id: string;
  schedule_id: string;
  requester_id: string;
  claimant_id: string | null;
  status: ShiftSwapStatus;
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface EditRequest {
  id: string;
  time_entry_id: string;
  profile_id: string;
  organization_id: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  reason: string;
  status: EditRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  organization_id: string;
  author_id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  is_active: boolean;
  expires_at: string | null;
  location_id: string | null;
  department_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  profile_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ---------- Insert Types ----------

export interface OrganizationInsert {
  name: string;
  slug: string;
  owner_id: string;
  id?: string;
  logo_url?: string | null;
  timezone?: string;
  pay_period_type?: PayPeriodType;
  pay_period_start_day?: number;
  overtime_threshold_weekly?: number;
  overtime_multiplier?: number;
  double_overtime_threshold?: number | null;
  double_overtime_multiplier?: number;
  subscription_tier?: SubscriptionTier;
}

export interface LocationInsert {
  organization_id: string;
  name: string;
  id?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

export interface DepartmentInsert {
  organization_id: string;
  name: string;
  id?: string;
  color?: string;
  location_id?: string | null;
}

export interface ProfileInsert {
  id: string;
  email: string;
  organization_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role?: UserRole;
  department_id?: string | null;
  location_id?: string | null;
  hire_date?: string | null;
  filing_status?: FilingStatus;
  federal_allowances?: number;
  state_allowances?: number;
  additional_withholding_federal?: number;
  additional_withholding_state?: number;
  is_active?: boolean;
}

export interface PayRateInsert {
  profile_id: string;
  organization_id: string;
  rate: number;
  id?: string;
  type?: PayRateType;
  label?: string;
  is_primary?: boolean;
  effective_date?: string;
  end_date?: string | null;
}

export interface TimeEntryInsert {
  profile_id: string;
  organization_id: string;
  clock_in: string;
  id?: string;
  clock_out?: string | null;
  clock_in_method?: string;
  clock_out_method?: string | null;
  is_split_shift?: boolean;
  total_break_minutes?: number;
  total_hours?: number | null;
  is_overtime?: boolean;
  overtime_hours?: number;
  status?: TimeEntryStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  location_id?: string | null;
  offline_synced?: boolean;
}

export interface BreakInsert {
  time_entry_id: string;
  profile_id: string;
  start_time: string;
  id?: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  is_paid?: boolean;
}

export interface PayPeriodInsert {
  organization_id: string;
  start_date: string;
  end_date: string;
  id?: string;
  status?: PayPeriodStatus;
  locked_at?: string | null;
  processed_at?: string | null;
  processed_by?: string | null;
  total_hours?: number | null;
  total_overtime_hours?: number | null;
  total_gross_pay?: number | null;
  notes?: string | null;
}

export interface PayrollEntryInsert {
  pay_period_id: string;
  profile_id: string;
  organization_id: string;
  id?: string;
  regular_hours?: number;
  overtime_hours?: number;
  double_overtime_hours?: number;
  regular_rate?: number | null;
  overtime_rate?: number | null;
  double_overtime_rate?: number | null;
  regular_pay?: number;
  overtime_pay?: number;
  double_overtime_pay?: number;
  bonus?: number;
  deductions?: number;
  bonus_note?: string | null;
  deduction_note?: string | null;
  gross_pay?: number;
  federal_income_tax?: number;
  state_income_tax?: number;
  social_security_tax?: number;
  medicare_tax?: number;
  federal_unemployment_tax?: number;
  state_unemployment_tax?: number;
  total_tax?: number;
  net_pay?: number;
  status?: PayrollEntryStatus;
}

export interface PtoPolicyInsert {
  organization_id: string;
  name: string;
  accrual_rate: number;
  id?: string;
  max_balance?: number | null;
  max_carryover?: number | null;
  color?: string;
  is_active?: boolean;
}

export interface PtoBalanceInsert {
  profile_id: string;
  pto_policy_id: string;
  organization_id: string;
  id?: string;
  balance_hours?: number;
  used_hours?: number;
  pending_hours?: number;
}

export interface PtoRequestInsert {
  profile_id: string;
  organization_id: string;
  pto_policy_id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  id?: string;
  note?: string | null;
  status?: PtoRequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface ScheduleInsert {
  organization_id: string;
  profile_id: string;
  start_time: string;
  end_time: string;
  id?: string;
  location_id?: string | null;
  department_id?: string | null;
  is_published?: boolean;
  published_at?: string | null;
  notes?: string | null;
}

export interface ShiftSwapRequestInsert {
  organization_id: string;
  schedule_id: string;
  requester_id: string;
  id?: string;
  claimant_id?: string | null;
  status?: ShiftSwapStatus;
  reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export interface EditRequestInsert {
  time_entry_id: string;
  profile_id: string;
  organization_id: string;
  reason: string;
  id?: string;
  requested_clock_in?: string | null;
  requested_clock_out?: string | null;
  status?: EditRequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface AnnouncementInsert {
  organization_id: string;
  author_id: string;
  title: string;
  content: string;
  id?: string;
  priority?: AnnouncementPriority;
  is_active?: boolean;
  expires_at?: string | null;
  location_id?: string | null;
  department_id?: string | null;
}

export interface AuditLogInsert {
  organization_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  id?: string;
  actor_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
}

export interface NotificationInsert {
  organization_id: string;
  profile_id: string;
  type: string;
  title: string;
  message: string;
  id?: string;
  link?: string | null;
  is_read?: boolean;
  read_at?: string | null;
}

// ---------- Update Types (all fields optional) ----------

export type OrganizationUpdate = Partial<Omit<Organization, "id" | "created_at">>;
export type LocationUpdate = Partial<Omit<Location, "id" | "created_at">>;
export type DepartmentUpdate = Partial<Omit<Department, "id" | "created_at">>;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "display_name">>;
export type PayRateUpdate = Partial<Omit<PayRate, "id" | "created_at">>;
export type TimeEntryUpdate = Partial<Omit<TimeEntry, "id" | "created_at">>;
export type BreakUpdate = Partial<Omit<Break, "id" | "created_at">>;
export type PayPeriodUpdate = Partial<Omit<PayPeriod, "id" | "created_at">>;
export type PayrollEntryUpdate = Partial<Omit<PayrollEntry, "id" | "created_at">>;
export type PtoPolicyUpdate = Partial<Omit<PtoPolicy, "id" | "created_at">>;
export type PtoBalanceUpdate = Partial<Omit<PtoBalance, "id">>;
export type PtoRequestUpdate = Partial<Omit<PtoRequest, "id" | "created_at">>;
export type ScheduleUpdate = Partial<Omit<Schedule, "id" | "created_at">>;
export type ShiftSwapRequestUpdate = Partial<Omit<ShiftSwapRequest, "id" | "created_at">>;
export type EditRequestUpdate = Partial<Omit<EditRequest, "id" | "created_at">>;
export type AnnouncementUpdate = Partial<Omit<Announcement, "id" | "created_at">>;
export type AuditLogUpdate = Partial<Omit<AuditLog, "id" | "created_at">>;
export type NotificationUpdate = Partial<Omit<Notification, "id" | "created_at">>;

// ---------- Database Type (Supabase structure) ----------

export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: OrganizationInsert; Update: OrganizationUpdate };
      locations: { Row: Location; Insert: LocationInsert; Update: LocationUpdate };
      departments: { Row: Department; Insert: DepartmentInsert; Update: DepartmentUpdate };
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate };
      pay_rates: { Row: PayRate; Insert: PayRateInsert; Update: PayRateUpdate };
      time_entries: { Row: TimeEntry; Insert: TimeEntryInsert; Update: TimeEntryUpdate };
      breaks: { Row: Break; Insert: BreakInsert; Update: BreakUpdate };
      pay_periods: { Row: PayPeriod; Insert: PayPeriodInsert; Update: PayPeriodUpdate };
      payroll_entries: { Row: PayrollEntry; Insert: PayrollEntryInsert; Update: PayrollEntryUpdate };
      pto_policies: { Row: PtoPolicy; Insert: PtoPolicyInsert; Update: PtoPolicyUpdate };
      pto_balances: { Row: PtoBalance; Insert: PtoBalanceInsert; Update: PtoBalanceUpdate };
      pto_requests: { Row: PtoRequest; Insert: PtoRequestInsert; Update: PtoRequestUpdate };
      schedules: { Row: Schedule; Insert: ScheduleInsert; Update: ScheduleUpdate };
      shift_swap_requests: { Row: ShiftSwapRequest; Insert: ShiftSwapRequestInsert; Update: ShiftSwapRequestUpdate };
      edit_requests: { Row: EditRequest; Insert: EditRequestInsert; Update: EditRequestUpdate };
      announcements: { Row: Announcement; Insert: AnnouncementInsert; Update: AnnouncementUpdate };
      audit_log: { Row: AuditLog; Insert: AuditLogInsert; Update: AuditLogUpdate };
      notifications: { Row: Notification; Insert: NotificationInsert; Update: NotificationUpdate };
    };
  };
}
