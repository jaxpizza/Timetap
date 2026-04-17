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
import { addEmployee, createDepartment } from "./actions";

interface Department {
  id: string;
  name: string;
}

interface AddEmployeeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddEmployeeSheet({
  open,
  onOpenChange,
  departments: initialDepartments,
  organizationId,
  onSuccess,
}: AddEmployeeSheetProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
  const [departments, setDepartments] = useState(initialDepartments);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim()) e.lastName = "Required";
    if (!email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Invalid email";
    if (!payRate || Number(payRate) <= 0) e.payRate = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRole("employee");
    setDepartmentId("");
    setNewDeptName("");
    setPayType("hourly");
    setPayRate("");
    setFilingStatus("single");
    setFederalAllowances("0");
    setStateAllowances("0");
    setTaxOpen(false);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    let deptId: string | null = departmentId || null;

    // Create new department if needed
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

    const result = await addEmployee({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
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
      toast.error(result.error || "Failed to add employee");
      return;
    }

    toast.success("Employee added successfully");
    reset();
    onOpenChange(false);
    onSuccess();
  }

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

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
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle
            className="font-heading text-lg font-bold"
            style={{ color: "var(--tt-text-primary)" }}
          >
            Add Employee
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5">
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
                  placeholder="Jane"
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
                  placeholder="Smith"
                  aria-invalid={!!errors.lastName}
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Email" error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                }}
                placeholder="jane@company.com"
                aria-invalid={!!errors.email}
              />
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
              <SelectPremium
                value={role}
                onValueChange={setRole}
                options={roleOptions}
              />
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
                    if (errors.payRate)
                      setErrors((p) => ({ ...p, payRate: "" }));
                  }}
                  placeholder="0.00"
                  className="pl-7"
                  aria-invalid={!!errors.payRate}
                />
              </div>
            </FieldGroup>
          </div>

          <Divider />

          {/* TAX INFO (collapsible) */}
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
                "Add Employee"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 w-full rounded-lg text-sm"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
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
