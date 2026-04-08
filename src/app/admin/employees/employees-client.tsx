"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  FileText,
  Ban,
  CheckCircle,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInitials } from "@/lib/utils";
import { AddEmployeeSheet } from "./add-employee-sheet";
import { EditEmployeeSheet } from "./edit-employee-sheet";
import { ApproveEmployeeSheet } from "./approve-employee-sheet";
import {
  deactivateEmployee,
  reactivateEmployee,
  deleteEmployee,
  rejectEmployee,
} from "./actions";

function capitalize(s?: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  department_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  filing_status?: string;
  federal_allowances?: number;
  state_allowances?: number;
  created_at: string;
}

interface PayRate {
  profile_id: string;
  type: string;
  rate: number;
}

interface Department {
  id: string;
  name: string;
}

const cardAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } },
};

const roleBadge: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(129,140,248,0.1)", text: "#818CF8" },
  admin: { bg: "rgba(167,139,250,0.1)", text: "#A78BFA" },
  manager: { bg: "rgba(251,191,36,0.1)", text: "#FBBF24" },
  employee: { bg: "rgba(52,211,153,0.1)", text: "#34D399" },
};

function InviteCodeBar({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Invite Code</p>
          <p className="font-mono text-base font-semibold tracking-[0.15em]" style={{ color: "var(--tt-text-primary)" }}>{code}</p>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "var(--tt-text-muted)" }}>Share this code with new employees to join</p>
      </div>
      <button onClick={handleCopy} className="flex size-8 items-center justify-center rounded-lg transition-colors" style={{ color: copied ? "#34D399" : "var(--tt-text-muted)" }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function EmployeesClient({
  employees,
  pendingEmployees,
  payRates,
  departments,
  organizationId,
  currentUserId,
  inviteCode = "",
}: {
  employees: Profile[];
  pendingEmployees: Profile[];
  payRates: PayRate[];
  departments: Department[];
  organizationId: string;
  currentUserId: string;
  inviteCode?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "pending" ? "pending" : "active";

  const [tab, setTab] = useState<"active" | "pending">(initialTab);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editEmp, setEditEmp] = useState<Profile | null>(null);
  const [approveEmp, setApproveEmp] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rateMap = new Map<string, PayRate>();
  for (const pr of payRates) rateMap.set(pr.profile_id, pr);

  const deptMap = new Map<string, string>();
  for (const d of departments) deptMap.set(d.id, d.name);

  const filtered = employees.filter((emp) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.toLowerCase();
    return name.includes(q) || emp.email.toLowerCase().includes(q);
  });

  async function handleDeactivate(id: string) {
    const r = await deactivateEmployee(id);
    r.success ? toast.success("Employee deactivated") : toast.error(r.error || "Failed");
    router.refresh();
  }

  async function handleReactivate(id: string) {
    const r = await reactivateEmployee(id);
    r.success ? toast.success("Employee reactivated") : toast.error(r.error || "Failed");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteEmployee(deleteTarget.id);
    setDeleting(false);
    r.success ? toast.success("Employee deleted") : toast.error(r.error || "Failed");
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleReject(id: string) {
    const r = await rejectEmployee(id, organizationId);
    r.success ? toast.success("Request rejected") : toast.error(r.error || "Failed");
    router.refresh();
  }

  const isSelf = (id: string) => id === currentUserId;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>
            Employees
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            Manage your team
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 active:scale-[0.98]"
        >
          <UserPlus size={16} />
          Add Employee
        </button>
      </div>

      {inviteCode && <InviteCodeBar code={inviteCode} />}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        <button
          onClick={() => setTab("active")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "active" ? "shadow-sm" : ""
          }`}
          style={{
            backgroundColor: tab === "active" ? "var(--tt-card-bg)" : "transparent",
            color: tab === "active" ? "var(--tt-text-primary)" : "var(--tt-text-muted)",
          }}
        >
          Active ({employees.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`relative flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "pending" ? "shadow-sm" : ""
          }`}
          style={{
            backgroundColor: tab === "pending" ? "var(--tt-card-bg)" : "transparent",
            color: tab === "pending" ? "var(--tt-text-primary)" : "var(--tt-text-muted)",
          }}
        >
          Pending
          {pendingEmployees.length > 0 && (
            <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-400">
              {pendingEmployees.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Tab */}
      {tab === "active" && (
        <>
          {employees.length > 0 && (
            <div className="relative mt-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9" />
            </div>
          )}

          {filtered.length === 0 && employees.length === 0 ? (
            <EmptyState onAdd={() => setAddOpen(true)} />
          ) : filtered.length === 0 ? (
            <p className="mt-8 text-center text-sm" style={{ color: "var(--tt-text-muted)" }}>
              No employees match &quot;{search}&quot;
            </p>
          ) : (
            <motion.div variants={cardAnim} initial="hidden" animate="show" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  rate={rateMap.get(emp.id)}
                  dept={emp.department_id ? deptMap.get(emp.department_id) : undefined}
                  isSelf={isSelf(emp.id)}
                  onEdit={() => setEditEmp(emp)}
                  onDeactivate={() => handleDeactivate(emp.id)}
                  onReactivate={() => handleReactivate(emp.id)}
                  onDelete={() => setDeleteTarget(emp)}
                />
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Pending Tab */}
      {tab === "pending" && (
        <>
          {pendingEmployees.length === 0 ? (
            <div className="mt-12 flex flex-col items-center rounded-xl py-12" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <Clock size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
              <p className="mt-3 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No pending requests</p>
              <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>Employees who use your invite code will appear here</p>
            </div>
          ) : (
            <motion.div variants={cardAnim} initial="hidden" animate="show" className="mt-4 space-y-3">
              {pendingEmployees.map((emp) => (
                <motion.div
                  key={emp.id}
                  variants={cardItem}
                  className="flex items-center justify-between rounded-xl p-4"
                  style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white" style={{ boxShadow: "0 0 8px rgba(99,102,241,0.2)" }}>
                      {getInitials(emp.first_name ?? undefined, emp.last_name ?? undefined)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>
                        {capitalize(emp.first_name)} {capitalize(emp.last_name)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>
                        {emp.email}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: "var(--tt-text-faint)" }}>
                        Requested {formatDistanceToNow(new Date(emp.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setApproveEmp(emp)}
                      className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(emp.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                    >
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Sheets & Dialogs */}
      <AddEmployeeSheet open={addOpen} onOpenChange={setAddOpen} departments={departments} organizationId={organizationId} onSuccess={() => router.refresh()} />

      {editEmp && (
        <EditEmployeeSheet
          open={!!editEmp}
          onOpenChange={(o) => { if (!o) setEditEmp(null); }}
          employee={editEmp}
          payRate={rateMap.get(editEmp.id) ?? null}
          departments={departments}
          organizationId={organizationId}
          onSuccess={() => { setEditEmp(null); router.refresh(); }}
        />
      )}

      {approveEmp && (
        <ApproveEmployeeSheet
          open={!!approveEmp}
          onOpenChange={(o) => { if (!o) setApproveEmp(null); }}
          employee={approveEmp}
          departments={departments}
          organizationId={organizationId}
          onSuccess={() => { setApproveEmp(null); router.refresh(); }}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold" style={{ color: "var(--tt-text-primary)" }}>Delete Employee</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tt-text-tertiary)" }}>
              Are you sure you want to permanently delete <span style={{ color: "var(--tt-text-primary)" }}>{capitalize(deleteTarget?.first_name)} {capitalize(deleteTarget?.last_name)}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ── Employee Card ── */

function EmployeeCard({
  emp, rate, dept, isSelf, onEdit, onDeactivate, onReactivate, onDelete,
}: {
  emp: Profile;
  rate?: PayRate;
  dept?: string;
  isSelf: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const badge = roleBadge[emp.role] ?? roleBadge.employee;
  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`group relative rounded-xl transition-all duration-200 ${!emp.is_active ? "opacity-60" : ""}`}
      style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}
    >
    <Link href={`/admin/employees/${emp.id}`} className="flex items-start gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white" style={{ boxShadow: "0 0 8px rgba(99,102,241,0.2)" }}>
          {getInitials(emp.first_name ?? undefined, emp.last_name ?? undefined)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>
              {capitalize(emp.first_name)} {capitalize(emp.last_name)}
            </p>
            {emp.role === "owner" && <span title="Organization Owner"><Shield size={12} className="shrink-0 text-amber-400" /></span>}
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: emp.is_active ? "#34D399" : "var(--tt-text-faint)" }} />
          </div>
          <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize" style={{ backgroundColor: badge.bg, color: badge.text }}>{emp.role}</span>
          {dept && <p className="mt-1 truncate text-xs" style={{ color: "var(--tt-text-tertiary)" }}>{dept}</p>}
          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--tt-text-muted)" }}>{emp.email}</p>
          {rate && <p className="mt-0.5 font-mono text-xs" style={{ color: "var(--tt-text-tertiary)" }}>${Number(rate.rate).toFixed(2)}{rate.type === "hourly" ? "/hr" : "/yr"}</p>}
        </div>
    </Link>
      <div className="absolute right-3 top-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--tt-text-muted)" }}>
            <MoreHorizontal size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-xl" style={{ backgroundColor: "var(--tt-dropdown-bg)", borderColor: "var(--tt-border)" }}>
            {emp.role === "owner" && !isSelf ? (
              /* Non-owners can only view the owner's profile */
              <DropdownMenuItem onClick={() => window.location.href = `/admin/employees/${emp.id}`} className="gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                <FileText size={14} /> View Profile
              </DropdownMenuItem>
            ) : isSelf ? (
              <>
                <DropdownMenuItem onClick={onEdit} className="gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                  <Pencil size={14} /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = `/admin/employees/${emp.id}`} className="gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                  <FileText size={14} /> View Profile
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={onEdit} className="gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                  <Pencil size={14} /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = `/admin/employees/${emp.id}`} className="gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                  <FileText size={14} /> View Profile
                </DropdownMenuItem>
                {emp.is_active ? (
                  <DropdownMenuItem onClick={onDeactivate} className="gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                    <Ban size={14} /> Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onReactivate} className="gap-2 rounded-lg px-3 py-2 text-sm text-emerald-400">
                    <CheckCircle size={14} /> Reactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator style={{ backgroundColor: "var(--tt-border-subtle)" }} />
                <DropdownMenuItem onClick={onDelete} className="gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 focus:bg-rose-500/[0.06] focus:text-rose-300">
                  <Trash2 size={14} /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

/* ── Empty State ── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}>
      <div className="flex size-16 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        <Users size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
      </div>
      <p className="mt-5 text-base font-semibold" style={{ color: "var(--tt-text-primary)" }}>No employees yet</p>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-muted)" }}>Add your first team member to get started</p>
      <button onClick={onAdd} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600">
        <UserPlus size={16} /> Add Employee
      </button>
    </div>
  );
}
