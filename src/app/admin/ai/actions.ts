"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";

export async function getWorkforceInsights(): Promise<string> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated.";

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return "No organization.";
  const orgId = profile.organization_id;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const [{ data: emps }, { data: active }, { data: thisWeek }, { data: lastWeek }, { data: pendingTS }, { data: pendingPTO }, { data: offSite }] = await Promise.all([
    supabase.from("profiles").select("id").eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active"),
    supabase.from("time_entries").select("id").eq("organization_id", orgId).eq("status", "active").is("clock_out", null),
    supabase.from("time_entries").select("total_hours").eq("organization_id", orgId).gte("clock_in", weekStart.toISOString()).in("status", ["completed", "approved"]),
    supabase.from("time_entries").select("total_hours").eq("organization_id", orgId).gte("clock_in", lastWeekStart.toISOString()).lt("clock_in", weekStart.toISOString()).in("status", ["completed", "approved"]),
    supabase.from("time_entries").select("id").eq("organization_id", orgId).eq("status", "completed"),
    supabase.from("pto_requests").select("id").eq("organization_id", orgId).eq("status", "pending"),
    supabase.from("time_entries").select("id").eq("organization_id", orgId).eq("clock_in_on_site", false).gte("clock_in", weekStart.toISOString()),
  ]);

  const totalEmps = emps?.length ?? 0;
  const activeNow = active?.length ?? 0;
  const weekHrs = (thisWeek ?? []).reduce((s, e) => s + (e.total_hours ?? 0), 0);
  const lastHrs = (lastWeek ?? []).reduce((s, e) => s + (e.total_hours ?? 0), 0);
  const pctChange = lastHrs > 0 ? ((weekHrs - lastHrs) / lastHrs * 100).toFixed(1) : "N/A";
  const pending = (pendingTS?.length ?? 0) + (pendingPTO?.length ?? 0);

  return `**Workforce Summary**

• **${totalEmps}** total employees, **${activeNow}** currently on the clock
• **${weekHrs.toFixed(1)}h** worked this week (${Number(pctChange) > 0 ? "+" : ""}${pctChange}% vs last week's ${lastHrs.toFixed(1)}h)
• **${offSite?.length ?? 0}** off-site clock-in(s) this week
• **${pending}** pending item(s) need review (${pendingTS?.length ?? 0} timesheets, ${pendingPTO?.length ?? 0} PTO requests)`;
}

export async function getOvertimeReport(): Promise<string> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated.";
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return "No organization.";
  const orgId = profile.organization_id;

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);

  const { data: entries } = await supabase.from("time_entries")
    .select("profile_id, total_hours, profiles!time_entries_profile_id_fkey(first_name, last_name)")
    .eq("organization_id", orgId).gte("clock_in", weekStart.toISOString()).in("status", ["completed", "approved"]);

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  const byEmp = new Map<string, { name: string; hours: number }>();
  for (const e of entries ?? []) {
    const key = e.profile_id;
    if (!byEmp.has(key)) byEmp.set(key, { name: `${cap((e as any).profiles?.first_name ?? "")} ${cap((e as any).profiles?.last_name ?? "")}`.trim(), hours: 0 });
    byEmp.get(key)!.hours += e.total_hours ?? 0;
  }

  const otEmps = Array.from(byEmp.values()).filter((e) => e.hours > 40).sort((a, b) => b.hours - a.hours);
  if (otEmps.length === 0) return "**Overtime Report**\n\nNo employees have overtime hours this week. 🎉";

  const lines = otEmps.map((e) => `• **${e.name}**: ${e.hours.toFixed(1)}h total (${(e.hours - 40).toFixed(1)}h OT)`);
  return `**Overtime Report (This Week)**\n\n${lines.join("\n")}\n\n**Total OT hours:** ${otEmps.reduce((s, e) => s + e.hours - 40, 0).toFixed(1)}h`;
}

export async function getLaborCostSummary(): Promise<string> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated.";
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return "No organization.";
  const orgId = profile.organization_id;

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);

  const [{ data: entries }, { data: rates }] = await Promise.all([
    supabase.from("time_entries").select("profile_id, total_hours, clock_in").eq("organization_id", orgId).gte("clock_in", weekStart.toISOString()).in("status", ["completed", "approved"]),
    supabase.from("pay_rates").select("profile_id, rate, type").eq("organization_id", orgId).eq("is_primary", true),
  ]);

  const rateMap = new Map<string, number>();
  for (const r of rates ?? []) rateMap.set(r.profile_id, r.type === "salary" ? Number(r.rate) / 2080 : Number(r.rate));

  let totalCost = 0;
  const dailyCost: Record<string, number> = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const e of entries ?? []) {
    const hrs = e.total_hours ?? 0;
    const rate = rateMap.get(e.profile_id) ?? 0;
    const cost = hrs * rate;
    totalCost += cost;
    const day = days[new Date(e.clock_in).getDay()];
    dailyCost[day] = (dailyCost[day] ?? 0) + cost;
  }

  const dailyLines = days.map((d) => `• ${d}: $${(dailyCost[d] ?? 0).toFixed(2)}`);

  return `**Labor Cost Summary (This Week)**\n\n${dailyLines.join("\n")}\n\n**Total: $${totalCost.toFixed(2)}**`;
}

export async function getAttendanceReport(): Promise<string> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated.";
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return "No organization.";
  const orgId = profile.organization_id;

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);

  const [{ data: offSite }, { data: longShifts }] = await Promise.all([
    supabase.from("time_entries")
      .select("profile_id, clock_in, profiles!time_entries_profile_id_fkey(first_name, last_name)")
      .eq("organization_id", orgId).eq("clock_in_on_site", false).gte("clock_in", weekStart.toISOString()),
    supabase.from("time_entries")
      .select("profile_id, clock_in, profiles!time_entries_profile_id_fkey(first_name, last_name)")
      .eq("organization_id", orgId).eq("status", "active").is("clock_out", null),
  ]);

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  let report = "**Attendance Report**\n\n";

  // Off-site
  if ((offSite?.length ?? 0) > 0) {
    report += `**Off-site clock-ins this week:** ${offSite!.length}\n`;
    const names = new Map<string, number>();
    for (const e of offSite!) {
      const n = `${cap((e as any).profiles?.first_name ?? "")} ${cap((e as any).profiles?.last_name ?? "")}`.trim();
      names.set(n, (names.get(n) ?? 0) + 1);
    }
    for (const [n, c] of names) report += `• ${n}: ${c} off-site clock-in(s)\n`;
  } else {
    report += "✅ No off-site clock-ins this week\n";
  }

  // Long active shifts
  const longOnes = (longShifts ?? []).filter((e) => (Date.now() - new Date(e.clock_in).getTime()) > 12 * 3600000);
  if (longOnes.length > 0) {
    report += `\n⚠️ **${longOnes.length} employee(s) clocked in for 12+ hours** (may have forgotten to clock out):\n`;
    for (const e of longOnes) {
      const n = `${cap((e as any).profiles?.first_name ?? "")} ${cap((e as any).profiles?.last_name ?? "")}`.trim();
      const hrs = ((Date.now() - new Date(e.clock_in).getTime()) / 3600000).toFixed(1);
      report += `• ${n}: ${hrs}h (since ${new Date(e.clock_in).toLocaleTimeString()})\n`;
    }
  } else {
    report += "\n✅ No unusually long active shifts\n";
  }

  return report;
}
