"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createPayPeriod(input: {
  organizationId: string;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pay_periods")
    .insert({
      organization_id: input.organizationId,
      start_date: input.startDate,
      end_date: input.endDate,
      status: "open",
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function lockPayPeriod(
  payPeriodId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("pay_periods")
    .update({ status: "locked", locked_at: new Date().toISOString() })
    .eq("id", payPeriodId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

interface PayrollEntry {
  profileId: string;
  name: string;
  department: string;
  regularHours: number;
  overtimeHours: number;
  regularRate: number;
  overtimeRate: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  ssTax: number;
  medicareTax: number;
  totalTax: number;
  netPay: number;
}

// 2024 Federal tax brackets (simplified, single filer)
function calcFederalTax(annualGross: number): number {
  const brackets = [
    { limit: 11600, rate: 0.10 },
    { limit: 47150, rate: 0.12 },
    { limit: 100525, rate: 0.22 },
    { limit: 191950, rate: 0.24 },
    { limit: 243725, rate: 0.32 },
    { limit: 609350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (annualGross <= prev) break;
    const taxable = Math.min(annualGross, b.limit) - prev;
    tax += taxable * b.rate;
    prev = b.limit;
  }
  return tax;
}

function getPeriodsPerYear(type: string): number {
  switch (type) {
    case "weekly": return 52;
    case "biweekly": return 26;
    case "semimonthly": return 24;
    case "monthly": return 12;
    default: return 26;
  }
}

export async function calculatePayroll(input: {
  payPeriodId: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  payPeriodType: string;
  stateTaxRate?: number;
}): Promise<{ success: boolean; entries?: PayrollEntry[]; error?: string }> {
  const admin = createAdminClient();

  // Fetch approved time entries in range
  const { data: timeEntries } = await admin
    .from("time_entries")
    .select("profile_id, total_hours")
    .eq("organization_id", input.organizationId)
    .in("status", ["approved", "completed"])
    .gte("clock_in", input.startDate + "T00:00:00")
    .lte("clock_in", input.endDate + "T23:59:59");

  // Fetch employees + pay rates
  const { data: employees } = await admin
    .from("profiles")
    .select("id, first_name, last_name, department_id")
    .eq("organization_id", input.organizationId)
    .eq("is_active", true)
    .eq("join_status", "active");

  const { data: payRates } = await admin
    .from("pay_rates")
    .select("profile_id, rate, type")
    .eq("organization_id", input.organizationId)
    .eq("is_primary", true);

  const { data: departments } = await admin
    .from("departments")
    .select("id, name")
    .eq("organization_id", input.organizationId);

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const rateMap = new Map<string, { rate: number; type: string }>();
  for (const pr of payRates ?? []) rateMap.set(pr.profile_id, pr);
  const deptMap = new Map<string, string>();
  for (const d of departments ?? []) deptMap.set(d.id, d.name);

  // Group hours by employee
  const hoursMap = new Map<string, number>();
  for (const te of timeEntries ?? []) {
    hoursMap.set(te.profile_id, (hoursMap.get(te.profile_id) ?? 0) + (te.total_hours ?? 0));
  }

  const periodsPerYear = getPeriodsPerYear(input.payPeriodType);
  const stateTaxRate = input.stateTaxRate ?? 0.05;
  const SS_RATE = 0.062;
  const SS_CAP = 168600;
  const MEDICARE_RATE = 0.0145;

  const entries: PayrollEntry[] = [];

  for (const emp of employees ?? []) {
    const totalHours = hoursMap.get(emp.id) ?? 0;
    if (totalHours === 0) continue; // skip employees with no hours

    const pr = rateMap.get(emp.id);
    const hourlyRate = pr ? (pr.type === "salary" ? Number(pr.rate) / 2080 : Number(pr.rate)) : 0;

    const regularHours = Math.min(totalHours, input.overtimeThreshold);
    const overtimeHours = Math.max(0, totalHours - input.overtimeThreshold);
    const overtimeRate = hourlyRate * input.overtimeMultiplier;

    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * overtimeRate;
    const grossPay = regularPay + overtimePay;

    // Annualize for tax calculation
    const annualGross = grossPay * periodsPerYear;
    const annualFedTax = calcFederalTax(annualGross);
    const federalTax = annualFedTax / periodsPerYear;

    const annualSS = Math.min(annualGross, SS_CAP) * SS_RATE;
    const ssTax = annualSS / periodsPerYear;

    const medicareTax = grossPay * MEDICARE_RATE;
    const stateTax = grossPay * stateTaxRate;
    const totalTax = federalTax + ssTax + medicareTax + stateTax;
    const netPay = grossPay - totalTax;

    entries.push({
      profileId: emp.id,
      name: `${cap(emp.first_name ?? "")} ${cap(emp.last_name ?? "")}`.trim(),
      department: emp.department_id ? deptMap.get(emp.department_id) ?? "" : "",
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      regularRate: Math.round(hourlyRate * 100) / 100,
      overtimeRate: Math.round(overtimeRate * 100) / 100,
      regularPay: Math.round(regularPay * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      federalTax: Math.round(federalTax * 100) / 100,
      stateTax: Math.round(stateTax * 100) / 100,
      ssTax: Math.round(ssTax * 100) / 100,
      medicareTax: Math.round(medicareTax * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    });
  }

  return { success: true, entries };
}

export async function approvePayroll(input: {
  payPeriodId: string;
  organizationId: string;
  entries: PayrollEntry[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  // Insert payroll entries
  const rows = input.entries.map((e) => ({
    pay_period_id: input.payPeriodId,
    profile_id: e.profileId,
    organization_id: input.organizationId,
    regular_hours: e.regularHours,
    overtime_hours: e.overtimeHours,
    regular_rate: e.regularRate,
    overtime_rate: e.overtimeRate,
    regular_pay: e.regularPay,
    overtime_pay: e.overtimePay,
    gross_pay: e.grossPay,
    federal_income_tax: e.federalTax,
    state_income_tax: e.stateTax,
    social_security_tax: e.ssTax,
    medicare_tax: e.medicareTax,
    total_tax: e.totalTax,
    net_pay: e.netPay,
    status: "approved",
  }));

  const { error: insertErr } = await admin.from("payroll_entries").insert(rows);
  if (insertErr) return { success: false, error: insertErr.message };

  // Update pay period
  const totalHours = input.entries.reduce((s, e) => s + e.regularHours + e.overtimeHours, 0);
  const totalOT = input.entries.reduce((s, e) => s + e.overtimeHours, 0);
  const totalGross = input.entries.reduce((s, e) => s + e.grossPay, 0);

  const { error: updateErr } = await admin
    .from("pay_periods")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
      processed_by: user.id,
      total_hours: Math.round(totalHours * 100) / 100,
      total_overtime_hours: Math.round(totalOT * 100) / 100,
      total_gross_pay: Math.round(totalGross * 100) / 100,
    })
    .eq("id", input.payPeriodId);

  if (updateErr) return { success: false, error: updateErr.message };
  return { success: true };
}

export async function exportPayrollCSV(
  payPeriodId: string
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const admin = createAdminClient();

  const { data: entries } = await admin
    .from("payroll_entries")
    .select("*, profiles!payroll_entries_profile_id_fkey(first_name, last_name)")
    .eq("pay_period_id", payPeriodId);

  if (!entries || entries.length === 0) return { success: false, error: "No entries found" };

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const header = "Employee,Regular Hours,OT Hours,Regular Pay,OT Pay,Gross Pay,Federal Tax,State Tax,SS Tax,Medicare Tax,Total Tax,Net Pay";
  const rows = entries.map((e: any) => {
    const name = `${cap(e.profiles?.first_name ?? "")} ${cap(e.profiles?.last_name ?? "")}`.trim();
    return `"${name}",${e.regular_hours},${e.overtime_hours},${e.regular_pay},${e.overtime_pay},${e.gross_pay},${e.federal_income_tax},${e.state_income_tax},${e.social_security_tax},${e.medicare_tax},${e.total_tax},${e.net_pay}`;
  });

  return { success: true, csv: [header, ...rows].join("\n") };
}
