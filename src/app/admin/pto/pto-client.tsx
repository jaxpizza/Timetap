"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarCheck, Palmtree, Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getInitials, parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { approvePTORequest, denyPTORequest, createPTOPolicy, deletePTOPolicy, assignPTOBalance } from "./actions";

interface PTORequest { id: string; profile_id: string; pto_policy_id: string; start_date: string; end_date: string; total_hours: number; note: string | null; profiles: { first_name: string | null; last_name: string | null } | null; pto_policies: { name: string; color: string } | null }
interface Policy { id: string; name: string; accrual_rate: number; max_balance: number | null; color: string; is_active: boolean }
interface Employee { id: string; first_name: string | null; last_name: string | null }
interface Balance { profile_id: string; pto_policy_id: string; balance_hours: number; used_hours: number; pending_hours: number }

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const COLORS = ["#818CF8", "#34D399", "#FBBF24", "#FB7185", "#A78BFA", "#38BDF8", "#F97316"];
const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

export function AdminPTOClient({ pendingRequests, policies, employees, balances, organizationId }: {
  pendingRequests: PTORequest[]; policies: Policy[]; employees: Employee[]; balances: Balance[]; organizationId: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [denyNote, setDenyNote] = useState("");
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleApprove(req: PTORequest) {
    setActionLoading(req.id + "-approve");
    const r = await approvePTORequest(req.id, req.profile_id, req.pto_policy_id, req.total_hours, req.start_date, req.end_date);
    setActionLoading(null);
    r.success ? (toast.success("Approved"), router.refresh()) : toast.error(r.error || "Failed");
  }

  async function handleDeny(req: PTORequest) {
    setActionLoading(req.id + "-deny");
    const r = await denyPTORequest(req.id, req.profile_id, req.pto_policy_id, req.total_hours, denyNote);
    setActionLoading(null);
    r.success ? (toast.success("Denied"), setDenyingId(null), setDenyNote(""), router.refresh()) : toast.error(r.error || "Failed");
  }

  async function handleDeletePolicy(id: string) {
    const r = await deletePTOPolicy(id);
    r.success ? (toast.success("Policy deleted"), router.refresh()) : toast.error(r.error || "Failed");
  }

  // Build balance lookup: balMap[profileId][policyId] = balance
  const balMap = new Map<string, Map<string, Balance>>();
  for (const b of balances) {
    if (!balMap.has(b.profile_id)) balMap.set(b.profile_id, new Map());
    balMap.get(b.profile_id)!.set(b.pto_policy_id, b);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>PTO Management</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Manage time off policies and requests</p>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Pending Requests ({pendingRequests.length})</p>
        {pendingRequests.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-xl py-10" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            <CalendarCheck size={24} style={{ color: "var(--tt-text-muted)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No pending requests</p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="mt-3 space-y-2">
            {pendingRequests.map((req) => {
              const name = `${capitalize(req.profiles?.first_name)} ${capitalize(req.profiles?.last_name)}`.trim();
              return (
                <motion.div key={req.id} variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">{getInitials(req.profiles?.first_name ?? undefined, req.profiles?.last_name ?? undefined)}</div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: req.pto_policies?.color }} />
                          <span className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{req.pto_policies?.name}</span>
                          <span className="text-xs" style={{ color: "var(--tt-text-tertiary)" }}>{format(parseLocalDate(req.start_date), "MMM d")} – {format(parseLocalDate(req.end_date), "MMM d")} · {req.total_hours}h</span>
                        </div>
                        {req.note && <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>"{req.note}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApprove(req)} disabled={!!actionLoading} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">{actionLoading === req.id + "-approve" ? "..." : "Approve"}</button>
                      {denyingId === req.id ? (
                        <div className="flex items-center gap-1">
                          <Input value={denyNote} onChange={(e) => setDenyNote(e.target.value)} placeholder="Reason" className="h-8 w-32 text-xs" />
                          <button onClick={() => handleDeny(req)} className="rounded-lg bg-rose-500/10 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20">Send</button>
                        </div>
                      ) : (
                        <button onClick={() => setDenyingId(req.id)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10">Deny</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Policies */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>PTO Policies ({policies.length})</p>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10">
            <Plus size={14} /> Add Policy
          </button>
        </div>
        {policies.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-xl py-10" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            <Palmtree size={24} style={{ color: "var(--tt-text-muted)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No policies yet</p>
            <button onClick={() => setAddOpen(true)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">Create your first PTO policy</button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {policies.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{p.name}</p>
                    <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Accrues {p.accrual_rate}h/period{p.max_balance ? ` · Max ${p.max_balance}h` : ""}</p>
                  </div>
                </div>
                <button onClick={() => handleDeletePolicy(p.id)} className="flex size-7 items-center justify-center rounded-md text-rose-400 transition-colors hover:bg-rose-500/10"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Balances */}
      {policies.length > 0 && employees.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Employee Balances</p>
          <div className="mt-3 overflow-x-auto rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
              <div className="w-40 shrink-0 text-xs font-semibold" style={{ color: "var(--tt-text-secondary)" }}>Employee</div>
              {policies.map((p) => (
                <div key={p.id} className="flex w-24 shrink-0 items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="truncate text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>{p.name}</span>
                </div>
              ))}
            </div>
            {/* Rows */}
            {employees.map((emp) => (
              <BalanceRow
                key={emp.id}
                employee={emp}
                policies={policies}
                balances={balMap.get(emp.id)}
                organizationId={organizationId}
                onSave={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      <AddPolicySheet open={addOpen} onOpenChange={setAddOpen} organizationId={organizationId} onSuccess={() => { setAddOpen(false); router.refresh(); }} />
    </motion.div>
  );
}

/* ── Balance Row ── */

function BalanceRow({ employee, policies, balances, organizationId, onSave }: {
  employee: Employee; policies: Policy[]; balances: Map<string, Balance> | undefined; organizationId: string; onSave: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(policyId: string) {
    setSaving(true);
    const r = await assignPTOBalance({
      profileId: employee.id,
      ptoPolicyId: policyId,
      organizationId,
      balanceHours: Number(value) || 0,
    });
    setSaving(false);
    if (r.success) {
      toast.success("Balance updated");
      setEditing(null);
      onSave();
    } else {
      toast.error(r.error || "Failed");
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
      <div className="flex w-40 shrink-0 items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
          {getInitials(employee.first_name ?? undefined, employee.last_name ?? undefined)}
        </div>
        <span className="truncate text-sm" style={{ color: "var(--tt-text-primary)" }}>
          {capitalize(employee.first_name)} {capitalize(employee.last_name)}
        </span>
      </div>
      {policies.map((p) => {
        const bal = balances?.get(p.id);
        const hrs = bal?.balance_hours ?? 0;
        const isEditing = editing === p.id;

        return (
          <div key={p.id} className="w-24 shrink-0">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-7 w-16 px-2 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(p.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
                <button
                  onClick={() => handleSave(p.id)}
                  disabled={saving}
                  className="flex size-6 items-center justify-center rounded text-emerald-400 transition-colors hover:bg-emerald-500/10"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditing(p.id);
                  setValue(String(hrs));
                }}
                className="rounded px-1.5 py-0.5 font-mono text-xs transition-colors hover:bg-[var(--tt-hover-overlay-strong)]"
                style={{ color: hrs > 0 ? "var(--tt-text-primary)" : "var(--tt-text-faint)" }}
              >
                {hrs > 0 ? `${hrs}h` : "0h"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Add Policy Sheet ── */

function AddPolicySheet({ open, onOpenChange, organizationId, onSuccess }: {
  open: boolean; onOpenChange: (o: boolean) => void; organizationId: string; onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [accrualRate, setAccrualRate] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !accrualRate) { toast.error("Name and accrual rate required"); return; }
    setLoading(true);
    const r = await createPTOPolicy({ name: name.trim(), accrualRate: Number(accrualRate), maxBalance: maxBalance ? Number(maxBalance) : null, color, organizationId });
    setLoading(false);
    if (r.success) { toast.success("Policy created"); setName(""); setAccrualRate(""); setMaxBalance(""); onSuccess(); }
    else toast.error(r.error || "Failed");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[400px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>Add PTO Policy</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Policy name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Vacation, Sick Leave" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Accrual rate (hours per pay period)</Label>
            <Input type="number" step="0.5" min="0" value={accrualRate} onChange={(e) => setAccrualRate(e.target.value)} placeholder="e.g., 4" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Max balance (optional)</Label>
            <Input type="number" min="0" value={maxBalance} onChange={(e) => setMaxBalance(e.target.value)} placeholder="e.g., 120" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`size-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2" : ""}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600">
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Policy"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
