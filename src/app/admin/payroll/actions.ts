"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAllEmployees } from "@/lib/notifications/create";

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

export async function deletePayPeriod(
  payPeriodId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  // Safety: only delete if no payroll entries exist
  const { count } = await admin
    .from("payroll_entries")
    .select("id", { count: "exact", head: true })
    .eq("pay_period_id", payPeriodId);
  if (count && count > 0) return { success: false, error: "Cannot delete a period with processed payroll entries" };

  const { error } = await admin.from("pay_periods").delete().eq("id", payPeriodId);
  if (error) return { success: false, error: error.message };
  return { success: true };
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

  // Notify all employees that payroll was processed
  notifyAllEmployees({
    organizationId: input.organizationId,
    type: "payroll_processed",
    title: "Payroll Processed",
    message: "Payroll has been processed. Check your timesheet for details.",
    link: "/dashboard/timesheet",
  }).catch(() => {});

  return { success: true };
}

export async function exportPayrollCSV(
  payPeriodId: string
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  const admin = createAdminClient();

  const [{ data: entries }, { data: period }] = await Promise.all([
    admin.from("payroll_entries").select("*, profiles!payroll_entries_profile_id_fkey(first_name, last_name, email, department_id, departments(name))").eq("pay_period_id", payPeriodId),
    admin.from("pay_periods").select("start_date, end_date").eq("id", payPeriodId).single(),
  ]);

  if (!entries || entries.length === 0) return { success: false, error: "No entries found" };

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const f2 = (n: number) => Number(n).toFixed(2);

  const header = "Employee Name,Email,Department,Period Start,Period End,Regular Hours,Overtime Hours,Total Hours,Hourly Rate,OT Rate,Regular Pay,Overtime Pay,Gross Pay,Federal Income Tax,State Income Tax,Social Security,Medicare,Total Taxes,Net Pay";

  const rows = entries.map((e: any) => {
    const name = `${cap(e.profiles?.first_name ?? "")} ${cap(e.profiles?.last_name ?? "")}`.trim();
    const email = e.profiles?.email ?? "";
    const dept = e.profiles?.departments?.name ?? "";
    const totalHrs = (Number(e.regular_hours) + Number(e.overtime_hours)).toFixed(2);
    return `"${name}","${email}","${dept}",${period?.start_date ?? ""},${period?.end_date ?? ""},${f2(e.regular_hours)},${f2(e.overtime_hours)},${totalHrs},${f2(e.regular_rate)},${f2(e.overtime_rate)},${f2(e.regular_pay)},${f2(e.overtime_pay)},${f2(e.gross_pay)},${f2(e.federal_income_tax)},${f2(e.state_income_tax)},${f2(e.social_security_tax)},${f2(e.medicare_tax)},${f2(e.total_tax)},${f2(e.net_pay)}`;
  });

  // Totals row
  const totals = entries.reduce((acc: any, e: any) => ({
    regHrs: acc.regHrs + Number(e.regular_hours), otHrs: acc.otHrs + Number(e.overtime_hours),
    regPay: acc.regPay + Number(e.regular_pay), otPay: acc.otPay + Number(e.overtime_pay),
    gross: acc.gross + Number(e.gross_pay), fedTax: acc.fedTax + Number(e.federal_income_tax),
    stateTax: acc.stateTax + Number(e.state_income_tax), ss: acc.ss + Number(e.social_security_tax),
    medicare: acc.medicare + Number(e.medicare_tax), totalTax: acc.totalTax + Number(e.total_tax),
    net: acc.net + Number(e.net_pay),
  }), { regHrs: 0, otHrs: 0, regPay: 0, otPay: 0, gross: 0, fedTax: 0, stateTax: 0, ss: 0, medicare: 0, totalTax: 0, net: 0 });

  const totalsRow = `"TOTALS","","","","",${f2(totals.regHrs)},${f2(totals.otHrs)},${f2(totals.regHrs + totals.otHrs)},"","",${f2(totals.regPay)},${f2(totals.otPay)},${f2(totals.gross)},${f2(totals.fedTax)},${f2(totals.stateTax)},${f2(totals.ss)},${f2(totals.medicare)},${f2(totals.totalTax)},${f2(totals.net)}`;

  const filename = `TimeTap_Payroll_${period?.start_date ?? "unknown"}_to_${period?.end_date ?? "unknown"}.csv`;
  return { success: true, csv: [header, ...rows, totalsRow].join("\n"), filename };
}

export async function generatePayrollReport(
  payPeriodId: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  const admin = createAdminClient();

  const [{ data: entries }, { data: period }, { data: org }] = await Promise.all([
    admin.from("payroll_entries").select("*, profiles!payroll_entries_profile_id_fkey(first_name, last_name, department_id, departments(name))").eq("pay_period_id", payPeriodId),
    admin.from("pay_periods").select("start_date, end_date, processed_at").eq("id", payPeriodId).single(),
    admin.from("pay_periods").select("organization_id").eq("id", payPeriodId).single().then(async (r) => {
      if (r.data) return admin.from("organizations").select("name").eq("id", r.data.organization_id).single();
      return { data: null };
    }),
  ]);

  if (!entries || entries.length === 0) return { success: false, error: "No entries found" };

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const f = (n: number) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const companyName = (org as any)?.data?.name ?? "Company";

  const totals = entries.reduce((acc: any, e: any) => ({
    regHrs: acc.regHrs + Number(e.regular_hours), otHrs: acc.otHrs + Number(e.overtime_hours),
    gross: acc.gross + Number(e.gross_pay), fedTax: acc.fedTax + Number(e.federal_income_tax),
    stateTax: acc.stateTax + Number(e.state_income_tax), ss: acc.ss + Number(e.social_security_tax),
    medicare: acc.medicare + Number(e.medicare_tax), totalTax: acc.totalTax + Number(e.total_tax),
    net: acc.net + Number(e.net_pay),
  }), { regHrs: 0, otHrs: 0, gross: 0, fedTax: 0, stateTax: 0, ss: 0, medicare: 0, totalTax: 0, net: 0 });

  const rows = entries.map((e: any) => {
    const name = `${cap(e.profiles?.first_name ?? "")} ${cap(e.profiles?.last_name ?? "")}`.trim();
    const dept = e.profiles?.departments?.name ?? "";
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#666;">${dept}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-family:monospace;">${f(e.regular_hours)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-family:monospace;">${f(e.overtime_hours)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-family:monospace;">$${f(e.gross_pay)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-family:monospace;color:#dc2626;">$${f(e.total_tax)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-family:monospace;font-weight:600;">$${f(e.net_pay)}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payroll Report — ${companyName}</title>
<style>@media print{body{margin:0}@page{margin:0.5in}}.no-print{display:none}@media screen{.no-print{display:block}}</style></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;max-width:900px;margin:0 auto;padding:32px;">
<div class="no-print" style="background:#4F46E5;color:white;padding:12px 20px;border-radius:8px;margin-bottom:24px;text-align:center;font-size:14px;cursor:pointer;" onclick="window.print()">Click here or press Ctrl+P / Cmd+P to print this report</div>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
  <div><h1 style="margin:0;font-size:24px;font-weight:700;">${companyName}</h1><p style="margin:4px 0 0;color:#666;font-size:14px;">Payroll Report</p></div>
  <div style="text-align:right;"><p style="margin:0;font-size:13px;color:#666;">Pay Period</p><p style="margin:2px 0 0;font-size:15px;font-weight:600;">${period?.start_date ?? ""} to ${period?.end_date ?? ""}</p>
  ${period?.processed_at ? `<p style="margin:4px 0 0;font-size:12px;color:#999;">Processed: ${new Date(period.processed_at).toLocaleDateString()}</p>` : ""}</div>
</div>
<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
<thead><tr style="background:#f9fafb;">
  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">Employee</th>
  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">Department</th>
  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">Reg Hrs</th>
  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">OT Hrs</th>
  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">Gross</th>
  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">Taxes</th>
  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb;">Net Pay</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr style="background:#f9fafb;font-weight:700;">
  <td style="padding:10px 12px;font-size:13px;" colspan="2">TOTALS</td>
  <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;">${f(totals.regHrs)}</td>
  <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;">${f(totals.otHrs)}</td>
  <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;">$${f(totals.gross)}</td>
  <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;color:#dc2626;">$${f(totals.totalTax)}</td>
  <td style="padding:10px 12px;font-size:13px;text-align:right;font-family:monospace;">$${f(totals.net)}</td>
</tr></tfoot></table>
<div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
  <div style="background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Tax Summary</p>
    <table style="width:100%;margin-top:8px;font-size:13px;"><tbody>
      <tr><td style="padding:3px 0;color:#666;">Federal Income Tax</td><td style="text-align:right;font-family:monospace;">$${f(totals.fedTax)}</td></tr>
      <tr><td style="padding:3px 0;color:#666;">State Income Tax</td><td style="text-align:right;font-family:monospace;">$${f(totals.stateTax)}</td></tr>
      <tr><td style="padding:3px 0;color:#666;">Social Security</td><td style="text-align:right;font-family:monospace;">$${f(totals.ss)}</td></tr>
      <tr><td style="padding:3px 0;color:#666;">Medicare</td><td style="text-align:right;font-family:monospace;">$${f(totals.medicare)}</td></tr>
      <tr style="font-weight:700;border-top:1px solid #e5e7eb;"><td style="padding:6px 0 0;">Total Taxes</td><td style="text-align:right;font-family:monospace;padding-top:6px;">$${f(totals.totalTax)}</td></tr>
    </tbody></table>
  </div>
  <div style="background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#666;font-weight:600;text-transform:uppercase;">Pay Summary</p>
    <table style="width:100%;margin-top:8px;font-size:13px;"><tbody>
      <tr><td style="padding:3px 0;color:#666;">Total Employees</td><td style="text-align:right;font-family:monospace;">${entries.length}</td></tr>
      <tr><td style="padding:3px 0;color:#666;">Total Hours</td><td style="text-align:right;font-family:monospace;">${f(totals.regHrs + totals.otHrs)}</td></tr>
      <tr><td style="padding:3px 0;color:#666;">Overtime Hours</td><td style="text-align:right;font-family:monospace;">${f(totals.otHrs)}</td></tr>
      <tr style="font-weight:700;border-top:1px solid #e5e7eb;"><td style="padding:6px 0 0;">Total Net Pay</td><td style="text-align:right;font-family:monospace;padding-top:6px;">$${f(totals.net)}</td></tr>
    </tbody></table>
  </div>
</div>
<p style="margin-top:32px;text-align:center;font-size:11px;color:#999;">Generated by TimeTap &mdash; ${companyName}</p>
</body></html>`;

  return { success: true, html };
}

export async function generatePayStubs(
  payPeriodId: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  const admin = createAdminClient();

  const [{ data: entries }, { data: period }] = await Promise.all([
    admin.from("payroll_entries").select("*, profiles!payroll_entries_profile_id_fkey(first_name, last_name, email, department_id, departments(name))").eq("pay_period_id", payPeriodId),
    admin.from("pay_periods").select("start_date, end_date, organization_id").eq("id", payPeriodId).single(),
  ]);

  if (!entries || entries.length === 0) return { success: false, error: "No entries found" };

  let companyName = "Company";
  if (period?.organization_id) {
    const { data: org } = await admin.from("organizations").select("name").eq("id", period.organization_id).single();
    if (org) companyName = org.name;
  }

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const f = (n: number) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const stubs = entries.map((e: any) => {
    const name = `${cap(e.profiles?.first_name ?? "")} ${cap(e.profiles?.last_name ?? "")}`.trim();
    const dept = e.profiles?.departments?.name ?? "";
    const email = e.profiles?.email ?? "";
    return `
<div style="page-break-after:always;max-width:600px;margin:0 auto 32px;padding:32px;border:1px solid #e5e7eb;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;">
    <div><h2 style="margin:0;font-size:18px;">${companyName}</h2><p style="margin:2px 0 0;font-size:12px;color:#666;">Pay Stub</p></div>
    <div style="text-align:right;"><p style="margin:0;font-size:12px;color:#666;">Pay Period</p><p style="margin:0;font-size:13px;font-weight:600;">${period?.start_date ?? ""} to ${period?.end_date ?? ""}</p></div>
  </div>
  <div style="margin-bottom:16px;">
    <p style="margin:0;font-size:14px;font-weight:600;">${name}</p>
    <p style="margin:2px 0 0;font-size:12px;color:#666;">${email}${dept ? ` &middot; ${dept}` : ""}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <tr style="background:#f9fafb;"><td colspan="3" style="padding:8px 12px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;border-bottom:1px solid #e5e7eb;">Earnings</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;">Regular</td><td style="text-align:center;font-size:13px;color:#666;">${f(e.regular_hours)} hrs &times; $${f(e.regular_rate)}</td><td style="text-align:right;padding:6px 12px;font-family:monospace;font-size:13px;">$${f(e.regular_pay)}</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;">Overtime</td><td style="text-align:center;font-size:13px;color:#666;">${f(e.overtime_hours)} hrs &times; $${f(e.overtime_rate)}</td><td style="text-align:right;padding:6px 12px;font-family:monospace;font-size:13px;">$${f(e.overtime_pay)}</td></tr>
    <tr style="border-top:1px solid #e5e7eb;font-weight:600;"><td style="padding:8px 12px;font-size:13px;">Gross Pay</td><td></td><td style="text-align:right;padding:8px 12px;font-family:monospace;font-size:13px;">$${f(e.gross_pay)}</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <tr style="background:#f9fafb;"><td colspan="2" style="padding:8px 12px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;border-bottom:1px solid #e5e7eb;">Deductions</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;">Federal Income Tax</td><td style="text-align:right;padding:6px 12px;font-family:monospace;font-size:13px;color:#dc2626;">$${f(e.federal_income_tax)}</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;">State Income Tax</td><td style="text-align:right;padding:6px 12px;font-family:monospace;font-size:13px;color:#dc2626;">$${f(e.state_income_tax)}</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;">Social Security</td><td style="text-align:right;padding:6px 12px;font-family:monospace;font-size:13px;color:#dc2626;">$${f(e.social_security_tax)}</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;">Medicare</td><td style="text-align:right;padding:6px 12px;font-family:monospace;font-size:13px;color:#dc2626;">$${f(e.medicare_tax)}</td></tr>
    <tr style="border-top:1px solid #e5e7eb;font-weight:600;"><td style="padding:8px 12px;font-size:13px;">Total Deductions</td><td style="text-align:right;padding:8px 12px;font-family:monospace;font-size:13px;color:#dc2626;">$${f(e.total_tax)}</td></tr>
  </table>
  <div style="background:#111;color:white;padding:16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:14px;font-weight:600;">Net Pay</span>
    <span style="font-size:24px;font-weight:700;font-family:monospace;">$${f(e.net_pay)}</span>
  </div>
  <p style="margin-top:12px;text-align:center;font-size:10px;color:#999;">Generated by TimeTap &mdash; ${companyName}</p>
</div>`;
  }).join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pay Stubs — ${companyName}</title>
<style>@media print{body{margin:0}@page{margin:0.3in}.no-print{display:none!important}}</style></head>
<body style="background:#f5f5f5;padding:16px;">
<div class="no-print" style="background:#4F46E5;color:white;padding:12px 20px;border-radius:8px;margin:0 auto 24px;max-width:600px;text-align:center;font-size:14px;font-family:sans-serif;cursor:pointer;" onclick="window.print()">Click here or press Ctrl+P / Cmd+P to print pay stubs</div>
${stubs}</body></html>`;

  return { success: true, html };
}
