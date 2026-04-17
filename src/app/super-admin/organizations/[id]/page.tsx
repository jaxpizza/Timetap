"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Clock, Trash2, Loader2, Pencil, X, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatHours, getInitials } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getOrganizationDetail, superUpdateOrganization, superUpdateProfile,
  superUpdatePayRate, transferOwnership, superDeleteOrganization, regenerateOrgInviteCode,
} from "../../actions";

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const roleBadge: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
  admin: { bg: "rgba(129,140,248,0.15)", text: "#818CF8" },
  payroll: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B" },
  manager: { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
  employee: { bg: "rgba(113,113,122,0.15)", text: "#A1A1AA" },
};

export default function OrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"employees" | "entries" | "payroll">("employees");
  const [loading, setLoading] = useState<string | null>(null);
  const [tier, setTier] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  function refresh() { getOrganizationDetail(orgId).then((d) => { setData(d); setTier(d.org?.subscription_tier ?? "free"); setInviteCode(d.org?.invite_code ?? ""); }); }
  useEffect(() => { refresh(); }, [orgId]);

  async function handleTierChange(newTier: string) {
    setTier(newTier);
    const r = await superUpdateOrganization(orgId, { subscription_tier: newTier });
    r.success ? toast.success("Tier updated") : toast.error(r.error || "Failed");
  }

  async function handleDelete() {
    if (deleteConfirm !== data?.org?.name) { toast.error("Type the org name to confirm"); return; }
    setLoading("delete");
    const r = await superDeleteOrganization(orgId);
    setLoading(null);
    if (r.success) { toast.success("Organization deleted"); router.push("/super-admin/organizations"); }
    else toast.error(r.error || "Failed");
  }

  if (!data) return <p className="py-12 text-center text-sm" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>;
  const { org, employees, entries, payPeriods, departments } = data;

  const tabs = [
    { key: "employees" as const, label: "Employees", count: employees.length },
    { key: "entries" as const, label: "Time Entries", count: entries.length },
    { key: "payroll" as const, label: "Payroll", count: payPeriods.length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/super-admin/organizations" className="mt-1 flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>{org?.name}</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--tt-text-muted)" }}>
            {org?.timezone} · Invite: {org?.invite_code} · Created {org?.created_at ? format(new Date(org.created_at), "MMM d, yyyy") : "—"}
          </p>
        </div>
      </div>

      {/* Invite Code */}
      <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Invite Code</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-mono text-lg font-semibold tracking-[0.15em]" style={{ color: "var(--tt-text-primary)" }}>{inviteCode || org?.invite_code}</p>
          <button onClick={() => { navigator.clipboard.writeText(inviteCode || org?.invite_code || ""); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); }}
            className="flex size-7 items-center justify-center rounded-md transition-colors" style={{ color: copied ? "#34D399" : "var(--tt-text-muted)" }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button onClick={async () => {
            setLoading("regen");
            const r = await regenerateOrgInviteCode(orgId);
            setLoading(null);
            if (r.success && r.code) { setInviteCode(r.code); toast.success("Code regenerated"); }
            else toast.error(r.error || "Failed");
          }} disabled={loading === "regen"} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            {loading === "regen" ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw size={12} />} Regenerate
          </button>
        </div>
      </div>

      {/* Settings cards */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Subscription Tier</p>
          <select value={tier} onChange={(e) => handleTierChange(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Pay Period</p>
          <p className="mt-2 font-mono text-sm capitalize" style={{ color: "var(--tt-text-primary)" }}>{org?.pay_period_type ?? "biweekly"}</p>
          <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>OT: {org?.overtime_threshold_weekly ?? 40}h @ {org?.overtime_multiplier ?? 1.5}x</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Features</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {org?.geofence_required && <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-400">Geofence</span>}
            {org?.job_sites_enabled && <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] text-teal-400">Job Sites</span>}
            {!org?.geofence_required && !org?.job_sites_enabled && <span className="text-xs" style={{ color: "var(--tt-text-faint)" }}>None enabled</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${tab === t.key ? "shadow-sm" : ""}`}
            style={{ backgroundColor: tab === t.key ? "var(--tt-card-bg)" : "transparent", color: tab === t.key ? "var(--tt-text-primary)" : "var(--tt-text-muted)" }}>
            {t.label} <span className="ml-1 text-xs" style={{ color: "var(--tt-text-faint)" }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === "employees" && (
          <div className="space-y-4">
            {/* Pending Approval */}
            {employees.filter((e: any) => e.join_status === "pending").length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-amber-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400">
                    Pending Approval ({employees.filter((e: any) => e.join_status === "pending").length})
                  </p>
                </div>
                <div className="space-y-2">
                  {employees.filter((e: any) => e.join_status === "pending").map((emp: any) => (
                    <div key={emp.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ backgroundColor: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.2)" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-[10px] font-bold text-white">
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{capitalize(emp.first_name)} {capitalize(emp.last_name)}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">Pending</span>
                            <span className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{emp.email}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setEditingEmp(emp)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Employees */}
            {employees.filter((e: any) => e.join_status !== "pending").length > 0 && (
              <div>
                {employees.filter((e: any) => e.join_status === "pending").length > 0 && (
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Active Employees</p>
                )}
                <div className="space-y-2">
                  {employees.filter((e: any) => e.join_status !== "pending").map((emp: any) => {
                    const badge = roleBadge[emp.role] ?? roleBadge.employee;
                    const rate = emp.pay_rates?.find((r: any) => r.is_primary);
                    return (
                      <div key={emp.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                            {getInitials(emp.first_name, emp.last_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{capitalize(emp.first_name)} {capitalize(emp.last_name)}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ backgroundColor: badge.bg, color: badge.text }}>{emp.role}</span>
                              <span className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{emp.email}</span>
                              {rate && <span className="font-mono text-[10px]" style={{ color: "var(--tt-text-faint)" }}>${Number(rate.rate).toFixed(2)}/{rate.type === "hourly" ? "hr" : "yr"}</span>}
                              {emp.join_status === "rejected" && <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-rose-400">Rejected</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setEditingEmp(emp)} className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-indigo-500/10" style={{ color: "var(--tt-text-muted)" }}>
                          <Pencil size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "entries" && (
          <div className="space-y-1">
            {entries.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg px-4 py-2" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-faint)" }}>
                <div className="flex items-center gap-3">
                  <p className="text-xs" style={{ color: "var(--tt-text-primary)" }}>{format(new Date(e.clock_in), "MMM d, h:mm a")}</p>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize"
                    style={{ backgroundColor: e.status === "approved" ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)", color: e.status === "approved" ? "#34D399" : "#FBBF24" }}>
                    {e.status}
                  </span>
                </div>
                <p className="font-mono text-xs" style={{ color: "var(--tt-text-tertiary)" }}>{e.total_hours ? `${Number(e.total_hours).toFixed(1)}h` : "active"}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "payroll" && (
          <div className="space-y-2">
            {payPeriods.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <div>
                  <p className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>{p.start_date} — {p.end_date}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ backgroundColor: "rgba(113,113,122,0.1)", color: "#71717A" }}>{p.status}</span>
                </div>
                {p.total_gross_pay && <p className="font-mono text-sm text-emerald-400">${Number(p.total_gross_pay).toFixed(2)}</p>}
              </div>
            ))}
            {payPeriods.length === 0 && <p className="py-8 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>No pay periods</p>}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-8 rounded-xl p-5" style={{ border: "1px solid rgba(251,113,133,0.2)", backgroundColor: "rgba(251,113,133,0.04)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Danger Zone</p>
        <p className="mt-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Delete this organization and all its data. This cannot be undone.</p>
        <div className="mt-3 flex items-center gap-2">
          <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={`Type "${org?.name}" to confirm`}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }} />
          <button onClick={handleDelete} disabled={loading === "delete" || deleteConfirm !== org?.name}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
            {loading === "delete" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 size={14} />} Delete
          </button>
        </div>
      </div>

      {/* Edit Employee Sheet */}
      {editingEmp && (
        <EditEmployeeSheet
          employee={editingEmp}
          orgId={orgId}
          orgName={org?.name ?? ""}
          currentOwnerId={org?.owner_id ?? ""}
          departments={departments ?? []}
          onClose={() => setEditingEmp(null)}
          onSave={() => { setEditingEmp(null); refresh(); }}
        />
      )}
    </motion.div>
  );
}

/* ── Edit Employee Sheet ── */

function EditEmployeeSheet({ employee, orgId, orgName, currentOwnerId, departments, onClose, onSave }: {
  employee: any; orgId: string; orgName: string; currentOwnerId: string;
  departments: { id: string; name: string }[];
  onClose: () => void; onSave: () => void;
}) {
  const [firstName, setFirstName] = useState(employee.first_name ?? "");
  const [lastName, setLastName] = useState(employee.last_name ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [role, setRole] = useState(employee.role ?? "employee");
  const [deptId, setDeptId] = useState(employee.department_id ?? "");
  const [payType, setPayType] = useState(employee.pay_rates?.find((r: any) => r.is_primary)?.type ?? "hourly");
  const [payRate, setPayRate] = useState(String(employee.pay_rates?.find((r: any) => r.is_primary)?.rate ?? "0"));
  const [filingStatus, setFilingStatus] = useState(employee.filing_status ?? "single");
  const [fedAllowances, setFedAllowances] = useState(String(employee.federal_allowances ?? 0));
  const [stateAllowances, setStateAllowances] = useState(String(employee.state_allowances ?? 0));
  const [isActive, setIsActive] = useState(employee.is_active ?? true);
  // Pre-flip pending to active so "Save" approves them; super admin can explicitly set back to pending/rejected
  const [joinStatus, setJoinStatus] = useState(employee.join_status === "pending" ? "active" : (employee.join_status ?? "active"));
  const [hireDate, setHireDate] = useState(employee.hire_date ?? "");
  const [loading, setLoading] = useState(false);
  const [showOwnerWarning, setShowOwnerWarning] = useState(false);

  const isChangingToOwner = role === "owner" && employee.role !== "owner";

  async function handleSave() {
    if (isChangingToOwner && !showOwnerWarning) {
      setShowOwnerWarning(true);
      return;
    }

    setLoading(true);

    // When transferring ownership, ONLY call transferOwnership — it handles the role
    if (isChangingToOwner) {
      const tr = await transferOwnership(orgId, employee.id, currentOwnerId);
      if (!tr.success) { setLoading(false); toast.error(tr.error || "Transfer failed"); return; }
    }

    // Update non-role profile fields
    const profileUpdates: Record<string, any> = {
      first_name: firstName, last_name: lastName, phone: phone || null,
      department_id: deptId || null,
      filing_status: filingStatus,
      federal_allowances: Number(fedAllowances),
      state_allowances: Number(stateAllowances),
      is_active: isActive,
      join_status: joinStatus,
      hire_date: hireDate || null,
    };
    if (!isChangingToOwner) {
      profileUpdates.role = role;
    }
    const r = await superUpdateProfile(employee.id, profileUpdates);

    // Update pay rate
    if (Number(payRate) > 0) {
      await superUpdatePayRate(employee.id, orgId, Number(payRate), payType);
    }

    setLoading(false);
    if (r.success) {
      const wasPending = employee.join_status === "pending";
      const isNowActive = joinStatus === "active";
      if (wasPending && isNowActive) toast.success(`${capitalize(firstName)} approved!`);
      else toast.success(isChangingToOwner ? "Ownership transferred" : "Employee updated");
      onSave();
    }
    else toast.error(r.error || "Failed");
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[440px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>
            {employee.join_status === "pending" ? "Approve" : "Edit"} {capitalize(employee.first_name)} {capitalize(employee.last_name)}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-6 py-5">
          {employee.join_status === "pending" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-400">Pending approval</p>
              <p className="mt-1 text-xs text-amber-300">
                Set their role, department, and pay rate, then change &quot;Join status&quot; below to &quot;Active&quot; to approve.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
            <Field label="Last name"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
          </div>
          <Field label="Email (read-only)"><p className="text-sm" style={{ color: "var(--tt-text-muted)" }}>{employee.email}</p></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>

          <Field label="Role">
            <select value={role} onChange={(e) => { setRole(e.target.value); setShowOwnerWarning(false); }}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="payroll">Payroll</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </Field>

          {showOwnerWarning && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-400">Ownership Transfer</p>
              <p className="mt-1 text-xs text-amber-300">
                This will make {capitalize(firstName)} the owner of {orgName}. The current owner will be demoted to admin.
              </p>
            </div>
          )}

          <Field label="Department">
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pay type">
              <select value={payType} onChange={(e) => setPayType(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
              </select>
            </Field>
            <Field label="Pay rate"><Input type="number" step="0.01" value={payRate} onChange={(e) => setPayRate(e.target.value)} /></Field>
          </div>

          <Field label="Filing status">
            <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
              <option value="single">Single</option>
              <option value="married_joint">Married Filing Jointly</option>
              <option value="married_separate">Married Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Federal allowances"><Input type="number" value={fedAllowances} onChange={(e) => setFedAllowances(e.target.value)} /></Field>
            <Field label="State allowances"><Input type="number" value={stateAllowances} onChange={(e) => setStateAllowances(e.target.value)} /></Field>
          </div>

          <Field label="Hire date"><Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Join status">
              <select value={joinStatus} onChange={(e) => setJoinStatus(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
          </div>

          <Button onClick={handleSave} disabled={loading} className="h-11 w-full rounded-xl bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600">
            {loading ? <Loader2 className="size-4 animate-spin" /> : showOwnerWarning && isChangingToOwner ? "Confirm Transfer & Save" : employee.join_status === "pending" ? "Approve Employee" : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>{label}</Label>
      {children}
    </div>
  );
}
