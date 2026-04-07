"use client";

import { useRouter } from "next/navigation";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Clock, Palmtree, ArrowLeftRight, AlertCircle, Building2, FileText, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatHours } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cancelPTORequest } from "@/app/dashboard/pto/actions";

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  department_id: string | null;
  notes: string | null;
  departments: { name: string; color: string } | null;
}

interface PTOReq {
  id: string;
  pto_policy_id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  status: string;
  pto_policies: { name: string; color: string } | null;
}

export type SelectedItem =
  | { kind: "shift"; shift: Shift; date: Date }
  | { kind: "pto"; date: Date; ptoName: string; ptoColor: string; req: PTOReq };

export function ShiftDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: SelectedItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();

  if (!item) return null;

  const isPast = isBefore(startOfDay(item.date), startOfDay(new Date()));
  const dateLabel = format(item.date, "EEEE, MMM d");

  function handleRequestPTO(dateStr: string) {
    onOpenChange(false);
    router.push(`/dashboard/pto?date=${dateStr}`);
  }

  async function handleCancelPTO(req: PTOReq) {
    const r = await cancelPTORequest(req.id, req.pto_policy_id, req.total_hours);
    if (r.success) {
      toast.success("Request cancelled");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(r.error || "Failed to cancel");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "w-full max-h-[85vh] rounded-t-2xl overflow-y-auto p-0"
            : "w-full overflow-y-auto p-0 sm:max-w-[420px]"
        }
        style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}
      >
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>
              {dateLabel}
            </SheetTitle>
            <StatusBadge item={item} isPast={isPast} />
          </div>
        </SheetHeader>

        <div className="space-y-4 px-6 py-5">
          {item.kind === "shift" ? (
            <ShiftDetails shift={item.shift} isPast={isPast} />
          ) : (
            <PTODetails req={item.req} ptoName={item.ptoName} ptoColor={item.ptoColor} />
          )}
        </div>

        <div className="space-y-2 border-t px-6 py-5" style={{ borderColor: "var(--tt-border-subtle)" }}>
          {item.kind === "shift" && !isPast && (
            <>
              <button
                onClick={() => handleRequestPTO(format(item.date, "yyyy-MM-dd"))}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
              >
                <Palmtree size={16} /> Request Time Off
              </button>
              <button
                onClick={() => toast("Shift swap requests coming soon")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: "rgba(99,102,241,0.3)", color: "#818CF8" }}
              >
                <ArrowLeftRight size={16} /> Request Shift Swap
              </button>
              <button
                onClick={() => toast("Issue reported")}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
                style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)" }}
              >
                <AlertCircle size={16} /> Report Issue
              </button>
            </>
          )}

          {item.kind === "shift" && isPast && (
            <button
              onClick={() => { onOpenChange(false); router.push("/dashboard/timesheet"); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-secondary)" }}
            >
              <ExternalLink size={16} /> View in Timesheet
            </button>
          )}

          {item.kind === "pto" && item.req.status === "pending" && (
            <button
              onClick={() => handleCancelPTO(item.req)}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={{ backgroundColor: "rgba(251,113,133,0.1)", color: "#FB7185" }}
            >
              Cancel Request
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ item, isPast }: { item: SelectedItem; isPast: boolean }) {
  if (item.kind === "pto") {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "#FBBF24" }}>
        PTO
      </span>
    );
  }
  if (isPast) {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(113,113,122,0.1)", color: "#71717A" }}>
        Completed
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#818CF8" }}>
      Scheduled
    </span>
  );
}

function ShiftDetails({ shift, isPast }: { shift: Shift; isPast: boolean }) {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const hours = (end.getTime() - start.getTime()) / 3600000;

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <div className="flex items-center gap-2">
        <Clock size={14} style={{ color: "var(--tt-text-muted)" }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>
          Shift Time
        </span>
      </div>
      <p className="mt-2 font-mono text-xl" style={{ color: "var(--tt-text-primary)" }}>
        {format(start, "h:mm a")} — {format(end, "h:mm a")}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
        {formatHours(hours)}
      </p>

      {shift.departments?.name && (
        <div className="mt-4 flex items-center gap-2">
          <Building2 size={14} style={{ color: "var(--tt-text-muted)" }} />
          <span className="size-2 rounded-full" style={{ backgroundColor: shift.departments.color }} />
          <span className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>{shift.departments.name}</span>
        </div>
      )}

      {shift.notes && (
        <div className="mt-3 flex items-start gap-2">
          <FileText size={14} className="mt-0.5 shrink-0" style={{ color: "var(--tt-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>{shift.notes}</p>
        </div>
      )}
    </div>
  );
}

function PTODetails({ req, ptoName, ptoColor }: { req: PTOReq; ptoName: string; ptoColor: string }) {
  const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
    approved: { label: "Approved", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
    denied: { label: "Denied", color: "#FB7185", bg: "rgba(251,113,133,0.1)" },
    cancelled: { label: "Cancelled", color: "#71717A", bg: "rgba(113,113,122,0.1)" },
  };
  const st = statusStyles[req.status] ?? statusStyles.pending;

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
      <div className="flex items-center gap-2">
        <Palmtree size={16} style={{ color: ptoColor }} />
        <span className="text-sm font-semibold" style={{ color: ptoColor }}>{ptoName}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>
          {st.label}
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <p className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>
          {format(new Date(req.start_date + "T12:00:00"), "MMM d")} – {format(new Date(req.end_date + "T12:00:00"), "MMM d")}
        </p>
        <p className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>
          {req.total_hours} hours
        </p>
      </div>
    </div>
  );
}
