"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPremium } from "@/components/ui/select-premium";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { approveEmployee, rejectEmployee, createDepartment } from "./actions";
import { getInitials } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface ApproveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  departments: Department[];
  organizationId: string;
  onSuccess: () => void;
}

const roleOptions = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "payroll", label: "Payroll" },
  { value: "admin", label: "Admin" },
];

const payTypeOptions = [
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
];

const filingOptions = [
  { value: "single", label: "Single" },
  { value: "married_joint", label: "Married Filing Jointly" },
  { value: "married_separate", label: "Married Filing Separately" },
  { value: "head_of_household", label: "Head of Household" },
];

function capitalize(s?: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ApproveEmployeeSheet({
  open,
  onOpenChange,
  employee,
  departments: initialDepts,
  organizationId,
  onSuccess,
}: ApproveSheetProps) {
  const [role, setRole] = useState("employee");
  const [departmentId, setDepartmentId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [payType, setPayType] = useState("hourly");
  const [payRate, setPayRate] = useState("");
  const [filingStatus, setFilingStatus] = useState("single");
  const [federalAllowances, setFederalAllowances] = useState("0");
  const [stateAllowances, setStateAllowances] = useState("0");
  const [taxOpen, setTaxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [departments, setDepartments] = useState(initialDepts);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const empName = `${capitalize(employee.first_name)} ${capitalize(employee.last_name)}`.trim();

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!payRate || Number(payRate) <= 0) {
      setErrors({ payRate: "Required" });
      return;
    }

    setLoading(true);

    let deptId: string | null = departmentId || null;
    if (!deptId && newDeptName.trim()) {
      const r = await createDepartment(newDeptName.trim(), organizationId);
      if (r.success && r.id) {
        deptId = r.id;
        setDepartments((p) => [...p, { id: deptId!, name: newDeptName.trim() }]);
      }
    }

    const result = await approveEmployee(employee.id, {
      role,
      departmentId: deptId,
      payType,
      payRate: Number(payRate),
      filingStatus,
      federalAllowances: Number(federalAllowances),
      stateAllowances: Number(stateAllowances),
      organizationId,
    });

    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Failed to approve");
      return;
    }
    toast.success(`${empName} approved!`);
    onOpenChange(false);
    onSuccess();
  }

  async function handleReject() {
    setRejecting(true);
    const result = await rejectEmployee(employee.id, organizationId);
    setRejecting(false);
    if (!result.success) {
      toast.error(result.error || "Failed to reject");
      return;
    }
    toast.success("Request rejected");
    onOpenChange(false);
    onSuccess();
  }

  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[480px]"
        style={{
          backgroundColor: "var(--tt-card-bg)",
          borderColor: "var(--tt-border)",
        }}
      >
        <SheetHeader
          className="border-b px-6 py-4"
          style={{ borderColor: "var(--tt-border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white"
              style={{ boxShadow: "0 0 8px rgba(99,102,241,0.2)" }}
            >
              {getInitials(employee.first_name ?? undefined, employee.last_name ?? undefined)}
            </div>
            <div>
              <SheetTitle
                className="font-heading text-lg font-bold"
                style={{ color: "var(--tt-text-primary)" }}
              >
                Approve {empName}
              </SheetTitle>
              <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>
                {employee.email}
              </p>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleApprove} className="px-6 py-5">
          <SectionLabel>Role & Department</SectionLabel>
          <div className="mt-3 space-y-4">
            <FieldGroup label="Role">
              <SelectPremium value={role} onValueChange={setRole} options={roleOptions} />
            </FieldGroup>
            <FieldGroup label="Department">
              {deptOptions.length > 0 ? (
                <SelectPremium
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  options={deptOptions}
                  placeholder="Select department"
                />
              ) : (
                <Input
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Type to create a department"
                />
              )}
            </FieldGroup>
          </div>

          <Divider />

          <SectionLabel>Compensation</SectionLabel>
          <div className="mt-3 space-y-4">
            <FieldGroup label="Pay type">
              <SelectPremium value={payType} onValueChange={setPayType} options={payTypeOptions} />
            </FieldGroup>
            <FieldGroup
              label={payType === "salary" ? "Annual salary" : "Hourly rate"}
              error={errors.payRate}
            >
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--tt-text-muted)" }}
                >
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payRate}
                  onChange={(e) => {
                    setPayRate(e.target.value);
                    if (errors.payRate) setErrors({});
                  }}
                  placeholder="0.00"
                  className="pl-7"
                  aria-invalid={!!errors.payRate}
                />
              </div>
            </FieldGroup>
          </div>

          <Divider />

          <button
            type="button"
            onClick={() => setTaxOpen(!taxOpen)}
            className="flex w-full items-center justify-between py-1"
          >
            <SectionLabel as="span">Tax Info</SectionLabel>
            {taxOpen ? (
              <ChevronUp size={14} style={{ color: "var(--tt-text-muted)" }} />
            ) : (
              <ChevronDown size={14} style={{ color: "var(--tt-text-muted)" }} />
            )}
          </button>
          {taxOpen && (
            <div className="mt-3 space-y-4">
              <FieldGroup label="Filing status">
                <SelectPremium value={filingStatus} onValueChange={setFilingStatus} options={filingOptions} />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Federal">
                  <Input type="number" min="0" value={federalAllowances} onChange={(e) => setFederalAllowances(e.target.value)} />
                </FieldGroup>
                <FieldGroup label="State">
                  <Input type="number" min="0" value={stateAllowances} onChange={(e) => setStateAllowances(e.target.value)} />
                </FieldGroup>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-emerald-500 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.99]"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Approve & Add to Team"}
            </Button>
            <button
              type="button"
              onClick={handleReject}
              disabled={rejecting}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              {rejecting ? <Loader2 className="size-4 animate-spin" /> : "Reject"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children, as: Tag = "p" }: { children: React.ReactNode; as?: "p" | "span" }) {
  return (
    <Tag className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>
      {children}
    </Tag>
  );
}

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 0%, var(--tt-divider) 50%, transparent 100%)" }} />
  );
}
