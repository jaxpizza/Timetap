"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarPlus, Palmtree, X } from "lucide-react";
import { toast } from "sonner";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPremium } from "@/components/ui/select-premium";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { requestPTO, cancelPTORequest } from "./actions";

interface Policy { id: string; name: string; color: string; accrual_rate: number; max_balance: number | null }
interface Balance { pto_policy_id: string; balance_hours: number; used_hours: number; pending_hours: number }
interface Request { id: string; pto_policy_id: string; start_date: string; end_date: string; total_hours: number; note: string | null; status: string; created_at: string; pto_policies: { name: string; color: string } | null }

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  approved: { label: "Approved", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  denied: { label: "Denied", color: "#FB7185", bg: "rgba(251,113,133,0.1)" },
  cancelled: { label: "Cancelled", color: "#71717A", bg: "rgba(113,113,122,0.1)" },
};

function calcWorkdays(start: string, end: string) {
  try {
    const days = eachDayOfInterval({ start: parseLocalDate(start), end: parseLocalDate(end) });
    return days.filter((d) => !isWeekend(d)).length * 8;
  } catch { return 0; }
}

export function PTOClient({ policies, balances, requests, organizationId }: {
  policies: Policy[]; balances: Balance[]; requests: Request[]; organizationId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [sheetOpen, setSheetOpen] = useState(!!dateParam);

  const balMap = new Map<string, Balance>();
  for (const b of balances) balMap.set(b.pto_policy_id, b);

  async function handleCancel(req: Request) {
    const r = await cancelPTORequest(req.id, req.pto_policy_id, req.total_hours);
    r.success ? (toast.success("Request cancelled"), router.refresh()) : toast.error(r.error || "Failed");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Time Off</h1>
        {policies.length > 0 && (
          <button onClick={() => setSheetOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600">
            <CalendarPlus size={16} /> Request Time Off
          </button>
        )}
      </div>

      {/* Balances */}
      {policies.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <Palmtree size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
          <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No PTO policies set up</p>
          <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>Your employer hasn&apos;t configured time off policies yet</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((p) => {
            const bal = balMap.get(p.id);
            const available = bal?.balance_hours ?? 0;
            const used = bal?.used_hours ?? 0;
            const pending = bal?.pending_hours ?? 0;
            const max = p.max_balance ?? available + used;
            const pct = max > 0 ? (used / max) * 100 : 0;
            return (
              <div key={p.id} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{p.name}</p>
                </div>
                <p className="mt-2 font-mono text-xl font-bold" style={{ color: "var(--tt-text-primary)" }}>{available}h <span className="text-sm font-normal" style={{ color: "var(--tt-text-muted)" }}>available</span></p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--tt-border-subtle)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: p.color }} />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: "var(--tt-text-muted)" }}>{used}h used · {pending}h pending</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Request history */}
      {requests.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Request History</p>
          <div className="mt-3 space-y-2">
            {requests.map((req) => {
              const st = statusStyle[req.status] ?? statusStyle.pending;
              return (
                <div key={req.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <div className="flex items-center gap-3">
                    <span className="size-2 rounded-full" style={{ backgroundColor: req.pto_policies?.color ?? "var(--tt-text-muted)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{req.pto_policies?.name}</p>
                      <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{format(parseLocalDate(req.start_date), "MMM d")} – {format(parseLocalDate(req.end_date), "MMM d")} · {req.total_hours}h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                    {req.status === "pending" && (
                      <button onClick={() => handleCancel(req)} className="flex size-6 items-center justify-center rounded-md text-rose-400 transition-colors hover:bg-rose-500/10"><X size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RequestSheet open={sheetOpen} onOpenChange={setSheetOpen} policies={policies} organizationId={organizationId} initialDate={dateParam} onSuccess={() => { setSheetOpen(false); router.refresh(); }} />
    </motion.div>
  );
}

function RequestSheet({ open, onOpenChange, policies, organizationId, initialDate, onSuccess }: {
  open: boolean; onOpenChange: (o: boolean) => void; policies: Policy[]; organizationId: string; initialDate?: string | null; onSuccess: () => void;
}) {
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const [startDate, setStartDate] = useState(initialDate ?? "");
  const [endDate, setEndDate] = useState(initialDate ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const totalHours = startDate && endDate ? calcWorkdays(startDate, endDate) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!policyId || !startDate || !endDate || totalHours <= 0) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    const r = await requestPTO({ ptoPolicyId: policyId, startDate, endDate, totalHours, note, organizationId });
    setLoading(false);
    if (r.success) { toast.success("Request submitted"); onSuccess(); }
    else toast.error(r.error || "Failed");
  }

  const policyOptions = policies.map((p) => ({ value: p.id, label: p.name }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[420px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>Request Time Off</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Type</Label>
            <SelectPremium value={policyId} onValueChange={setPolicyId} options={policyOptions} placeholder="Select type" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {totalHours > 0 && <p className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>{totalHours} hours ({totalHours / 8} workdays)</p>}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for time off" />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600">
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
