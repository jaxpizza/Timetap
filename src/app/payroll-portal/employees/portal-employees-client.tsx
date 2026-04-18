"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Search, DollarSign, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SelectPremium } from "@/components/ui/select-premium";
import { getInitials } from "@/lib/utils";
import { updateEmployeePayInfo } from "./actions";

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  department_id: string | null;
  is_active: boolean;
  filing_status?: string | null;
  federal_allowances?: number | null;
  state_allowances?: number | null;
  hire_date?: string | null;
}

interface PayRate { profile_id: string; rate: number; type: string }
interface Department { id: string; name: string }

const roleBadge: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
  admin: { bg: "rgba(129,140,248,0.15)", text: "#818CF8" },
  payroll: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B" },
  manager: { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
  employee: { bg: "rgba(113,113,122,0.15)", text: "#A1A1AA" },
};

export function PortalEmployeesClient({
  orgId, orgName, employees, payRates, departments,
}: {
  orgId: string;
  orgName: string;
  employees: Profile[];
  payRates: PayRate[];
  departments: Department[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editEmp, setEditEmp] = useState<Profile | null>(null);

  const rateMap = new Map<string, PayRate>();
  for (const pr of payRates) rateMap.set(pr.profile_id, pr);
  const deptMap = new Map<string, string>();
  for (const d of departments) deptMap.set(d.id, d.name);

  const filtered = employees.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${e.first_name ?? ""} ${e.last_name ?? ""} ${e.email}`.toLowerCase().includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Employees</h1>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Payroll View</span>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
          {orgName} · {employees.length} active {employees.length === 1 ? "employee" : "employees"}
        </p>
      </div>

      <div className="relative mt-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
      </div>

      {/* Table header */}
      <div className="mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        <div className="hidden grid-cols-12 gap-4 border-b px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider md:grid" style={{ borderColor: "var(--tt-border-faint)", color: "var(--tt-text-muted)" }}>
          <div className="col-span-4">Employee</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-2">Pay Rate</div>
          <div className="col-span-2">Filing Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Users size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>
              {search ? `No matches for "${search}"` : "No active employees"}
            </p>
          </div>
        ) : (
          filtered.map((emp, i) => {
            const rate = rateMap.get(emp.id);
            const dept = emp.department_id ? deptMap.get(emp.department_id) : undefined;
            const badge = roleBadge[emp.role] ?? roleBadge.employee;
            return (
              <div key={emp.id} className="grid grid-cols-1 gap-2 p-4 md:grid-cols-12 md:items-center md:gap-4"
                style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--tt-border-faint)" : undefined }}>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                    {getInitials(emp.first_name ?? undefined, emp.last_name ?? undefined)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>
                      {capitalize(emp.first_name)} {capitalize(emp.last_name)}
                    </p>
                    <p className="truncate text-[11px]" style={{ color: "var(--tt-text-muted)" }}>{emp.email}</p>
                    <span className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize md:hidden" style={{ backgroundColor: badge.bg, color: badge.text }}>
                      {emp.role}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 text-xs" style={{ color: "var(--tt-text-tertiary)" }}>
                  {dept ?? <span style={{ color: "var(--tt-text-muted)" }}>—</span>}
                </div>
                <div className="col-span-2 font-mono text-xs" style={{ color: "var(--tt-text-primary)" }}>
                  {rate ? (
                    <>
                      {$(Number(rate.rate))}
                      <span className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{rate.type === "hourly" ? "/hr" : "/yr"}</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--tt-text-muted)" }}>—</span>
                  )}
                </div>
                <div className="col-span-2 text-xs capitalize" style={{ color: "var(--tt-text-tertiary)" }}>
                  {emp.filing_status ?? <span style={{ color: "var(--tt-text-muted)" }}>—</span>}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span className="hidden rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize md:inline-block" style={{ backgroundColor: badge.bg, color: badge.text }}>
                    {emp.role}
                  </span>
                  <button
                    onClick={() => setEditEmp(emp)}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                  >
                    <Pencil size={11} /> Pay Info
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info banner */}
      <p className="mt-4 rounded-lg px-4 py-2 text-[11px]" style={{ backgroundColor: "rgba(245,158,11,0.06)", color: "var(--tt-text-tertiary)", border: "1px dashed rgba(245,158,11,0.25)" }}>
        As a payroll provider, you can edit pay rate, filing status, and allowances. Role, department, and profile details are managed by the company admin.
      </p>

      {editEmp && (
        <EditPayInfoSheet
          open={!!editEmp}
          onOpenChange={(o) => { if (!o) setEditEmp(null); }}
          employee={editEmp}
          payRate={rateMap.get(editEmp.id) ?? null}
          orgId={orgId}
          onSuccess={() => { setEditEmp(null); router.refresh(); }}
        />
      )}
    </motion.div>
  );
}

function EditPayInfoSheet({
  open, onOpenChange, employee, payRate, orgId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Profile;
  payRate: PayRate | null;
  orgId: string;
  onSuccess: () => void;
}) {
  const [payType, setPayType] = useState(payRate?.type ?? "hourly");
  const [payRateValue, setPayRateValue] = useState(payRate ? String(payRate.rate) : "");
  const [filingStatus, setFilingStatus] = useState(employee.filing_status ?? "single");
  const [federal, setFederal] = useState(String(employee.federal_allowances ?? 0));
  const [state, setState] = useState(String(employee.state_allowances ?? 0));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const r = await updateEmployeePayInfo({
      organizationId: orgId,
      profileId: employee.id,
      payType,
      payRate: Number(payRateValue) || 0,
      filingStatus,
      federalAllowances: Number(federal) || 0,
      stateAllowances: Number(state) || 0,
    });
    setSaving(false);
    if (r.success) {
      toast.success("Pay info updated");
      onSuccess();
    } else {
      toast.error(r.error || "Failed");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>
            Pay Info — {capitalize(employee.first_name)} {capitalize(employee.last_name)}
          </SheetTitle>
          <SheetDescription className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            Edit financial and tax fields only.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Pay Type</label>
              <SelectPremium value={payType} onValueChange={setPayType} options={[
                { value: "hourly", label: "Hourly" },
                { value: "salary", label: "Salary" },
              ]} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
                Rate {payType === "hourly" ? "($/hr)" : "($/yr)"}
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
                <Input type="number" value={payRateValue} onChange={(e) => setPayRateValue(e.target.value)} className="pl-9 font-mono" min="0" step="0.01" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Filing Status</label>
            <SelectPremium value={filingStatus} onValueChange={setFilingStatus} options={[
              { value: "single", label: "Single" },
              { value: "married", label: "Married Filing Jointly" },
              { value: "head_of_household", label: "Head of Household" },
            ]} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Federal Allowances</label>
              <Input type="number" value={federal} onChange={(e) => setFederal(e.target.value)} min="0" step="1" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>State Allowances</label>
              <Input type="number" value={state} onChange={(e) => setState(e.target.value)} min="0" step="1" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1" style={{ color: "var(--tt-text-tertiary)" }}>
            <X size={14} /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-amber-500 text-white hover:bg-amber-600">
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
