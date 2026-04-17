"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEmployee, deleteEmployee, createDepartment } from "./actions";

interface Department {
  id: string;
  name: string;
}

interface EditEmployeeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    role: string;
    department_id: string | null;
    filing_status?: string;
    federal_allowances?: number;
    state_allowances?: number;
  };
  payRate: { type: string; rate: number } | null;
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

export function EditEmployeeSheet({
  open,
  onOpenChange,
  employee,
  payRate,
  departments: initialDepartments,
  organizationId,
  onSuccess,
}: EditEmployeeSheetProps) {
  const [firstName, setFirstName] = useState(employee.first_name ?? "");
  const [lastName, setLastName] = useState(employee.last_name ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [role, setRole] = useState(employee.role);
  const [departmentId, setDepartmentId] = useState(
    employee.department_id ?? ""
  );
  const [newDeptName, setNewDeptName] = useState("");
  const [payType, setPayType] = useState(payRate?.type ?? "hourly");
  const [payRateVal, setPayRateVal] = useState(
    payRate ? String(payRate.rate) : ""
  );
  const [filingStatus, setFilingStatus] = useState(
    employee.filing_status ?? "single"
  );
  const [federalAllowances, setFederalAllowances] = useState(
    String(employee.federal_allowances ?? 0)
  );
  const [stateAllowances, setStateAllowances] = useState(
    String(employee.state_allowances ?? 0)
  );
  const [taxOpen, setTaxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [departments, setDepartments] = useState(initialDepartments);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim()) e.lastName = "Required";
    if (!payRateVal || Number(payRateVal) <= 0) e.payRate = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    let deptId: string | null = departmentId || null;

    if (!deptId && newDeptName.trim()) {
      const deptResult = await createDepartment(
        newDeptName.trim(),
        organizationId
      );
      if (deptResult.success && deptResult.id) {
        deptId = deptResult.id;
        setDepartments((prev) => [
          ...prev,
          { id: deptId!, name: newDeptName.trim() },
        ]);
      }
    }

    const result = await updateEmployee(employee.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      role,
      departmentId: deptId,
      payType,
      payRate: Number(payRateVal),
      filingStatus,
      federalAllowances: Number(federalAllowances),
      stateAllowances: Number(stateAllowances),
      organizationId,
    });

    setLoading(false);

    if (!result.success) {
      toast.error(result.error || "Failed to update employee");
      return;
    }

    toast.success("Employee updated");
    onOpenChange(false);
    onSuccess();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteEmployee(employee.id);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error || "Failed to delete employee");
      return;
    }

    toast.success("Employee deleted");
    setDeleteDialogOpen(false);
    onOpenChange(false);
    onSuccess();
  }

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const empName = `${capitalize(employee.first_name)} ${capitalize(employee.last_name)}`.trim();

  return (
    <>
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
            <SheetTitle
              className="font-heading text-lg font-bold"
              style={{ color: "var(--tt-text-primary)" }}
            >
              Edit Employee
            </SheetTitle>
            <p className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
              {empName}
            </p>
          </SheetHeader>

          <form onSubmit={handleSave} className="px-6 py-5">
            {/* PERSONAL INFO */}
            <SectionLabel>Personal Info</SectionLabel>
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="First name" error={errors.firstName}>
                  <Input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName)
                        setErrors((p) => ({ ...p, firstName: "" }));
                    }}
                    aria-invalid={!!errors.firstName}
                  />
                </FieldGroup>
                <FieldGroup label="Last name" error={errors.lastName}>
                  <Input
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.lastName)
                        setErrors((p) => ({ ...p, lastName: "" }));
                    }}
                    aria-invalid={!!errors.lastName}
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Email">
                <Input value={employee.email} disabled className="opacity-60" />
              </FieldGroup>
              <FieldGroup label="Phone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </FieldGroup>
            </div>

            <Divider />

            {/* ROLE & DEPARTMENT */}
            <SectionLabel>Role & Department</SectionLabel>
            <div className="mt-3 space-y-4">
              <FieldGroup label="Role">
                {employee.role === "owner" ? (
                  <p className="rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border)", color: "var(--tt-text-muted)" }}>
                    Owner <span className="text-xs">(cannot be changed)</span>
                  </p>
                ) : (
                  <SelectPremium
                    value={role}
                    onValueChange={setRole}
                    options={roleOptions}
                  />
                )}
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

            {/* COMPENSATION */}
            <SectionLabel>Compensation</SectionLabel>
            <div className="mt-3 space-y-4">
              <FieldGroup label="Pay type">
                <SelectPremium
                  value={payType}
                  onValueChange={setPayType}
                  options={payTypeOptions}
                />
              </FieldGroup>
              <FieldGroup
                label={
                  payType === "salary" ? "Annual salary" : "Hourly rate"
                }
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
                    value={payRateVal}
                    onChange={(e) => {
                      setPayRateVal(e.target.value);
                      if (errors.payRate)
                        setErrors((p) => ({ ...p, payRate: "" }));
                    }}
                    className="pl-7"
                    aria-invalid={!!errors.payRate}
                  />
                </div>
              </FieldGroup>
            </div>

            <Divider />

            {/* TAX INFO */}
            <button
              type="button"
              onClick={() => setTaxOpen(!taxOpen)}
              className="flex w-full items-center justify-between py-1"
            >
              <SectionLabel as="span">Tax Info</SectionLabel>
              {taxOpen ? (
                <ChevronUp
                  size={14}
                  style={{ color: "var(--tt-text-muted)" }}
                />
              ) : (
                <ChevronDown
                  size={14}
                  style={{ color: "var(--tt-text-muted)" }}
                />
              )}
            </button>
            {taxOpen && (
              <div className="mt-3 space-y-4">
                <FieldGroup label="Filing status">
                  <SelectPremium
                    value={filingStatus}
                    onValueChange={setFilingStatus}
                    options={filingOptions}
                  />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="Federal allowances">
                    <Input
                      type="number"
                      min="0"
                      value={federalAllowances}
                      onChange={(e) => setFederalAllowances(e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="State allowances">
                    <Input
                      type="number"
                      min="0"
                      value={stateAllowances}
                      onChange={(e) => setStateAllowances(e.target.value)}
                    />
                  </FieldGroup>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg bg-indigo-500 text-sm font-semibold text-white transition-all hover:bg-indigo-600 active:scale-[0.99]"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 size={15} />
                Delete Employee
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          style={{
            backgroundColor: "var(--tt-card-bg)",
            borderColor: "var(--tt-border)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="font-heading text-base font-bold"
              style={{ color: "var(--tt-text-primary)" }}
            >
              Delete Employee
            </DialogTitle>
            <DialogDescription
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              Are you sure you want to permanently delete{" "}
              <span style={{ color: "var(--tt-text-primary)" }}>
                {empName}
              </span>
              ? This action cannot be undone. All their time entries, schedules,
              and records will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-sm"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-rose-500 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── helpers ── */

function SectionLabel({
  children,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  as?: "p" | "span";
}) {
  return (
    <Tag
      className="text-[10px] font-semibold uppercase tracking-[0.15em]"
      style={{ color: "var(--tt-text-muted)" }}
    >
      {children}
    </Tag>
  );
}

function FieldGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        className="text-xs font-medium"
        style={{ color: "var(--tt-text-secondary)" }}
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function Divider() {
  return (
    <div
      className="my-5 h-[1px]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, var(--tt-divider) 50%, transparent 100%)",
      }}
    />
  );
}
