"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Clock, FileText, ChevronDown, ChevronUp, Trash2, Undo2, MapPin, PenSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatHours, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { approveTimeEntry, approveAllForEmployee, flagTimeEntry, unflagTimeEntry, deleteTimeEntry, addManualEntry, editTimeEntry } from "./actions";
import { ManualEntrySheet, ManualEntryExisting } from "@/components/manual-entry-sheet";

interface Entry {
  id: string;
  profile_id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  total_break_minutes: number | null;
  status: string;
  notes: string | null;
  approved_at?: string | null;
  clock_in_on_site?: boolean | null;
  clock_out_on_site?: boolean | null;
  profiles: { first_name: string | null; last_name: string | null; department_id: string | null } | null;
}
interface PayRate { profile_id: string; rate: number; type: string }
interface Department { id: string; name: string }
interface Employee { id: string; first_name: string | null; last_name: string | null; email: string }

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

function groupByEmployee(entries: Entry[]) {
  const map = new Map<string, { name: string; deptId: string | null; entries: Entry[] }>();
  for (const e of entries) {
    if (!map.has(e.profile_id)) map.set(e.profile_id, { name: `${capitalize(e.profiles?.first_name)} ${capitalize(e.profiles?.last_name)}`.trim(), deptId: e.profiles?.department_id ?? null, entries: [] });
    map.get(e.profile_id)!.entries.push(e);
  }
  return Array.from(map.entries()).map(([id, d]) => ({ profileId: id, ...d }));
}

type TabKey = "pending" | "approved" | "flagged";

export function TimesheetsClient({ pendingEntries, approvedEntries, flaggedEntries, payRates, departments, employees = [], adderName = "Admin", organizationId }: {
  pendingEntries: Entry[]; approvedEntries: Entry[]; flaggedEntries: Entry[]; payRates: PayRate[]; departments: Department[]; employees?: Employee[]; adderName?: string; organizationId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("pending");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntryExisting | null>(null);

  const rateMap = new Map<string, number>();
  for (const pr of payRates) rateMap.set(pr.profile_id, pr.type === "salary" ? Number(pr.rate) / 2080 : Number(pr.rate));
  const deptMap = new Map<string, string>();
  for (const d of departments) deptMap.set(d.id, d.name);

  const pendingGroups = groupByEmployee(pendingEntries);
  const approvedGroups = groupByEmployee(approvedEntries);
  const flaggedGroups = groupByEmployee(flaggedEntries);

  function openAdd() { setEditingEntry(null); setSheetOpen(true); }
  function openEdit(entry: Entry) {
    setEditingEntry({
      id: entry.id,
      profile_id: entry.profile_id,
      clock_in: entry.clock_in,
      clock_out: entry.clock_out,
      total_break_minutes: entry.total_break_minutes,
      notes: entry.notes,
    });
    setSheetOpen(true);
  }

  const tabs: { key: TabKey; label: string; count?: number; badgeColor?: string }[] = [
    { key: "pending", label: "Pending Review", count: pendingEntries.length, badgeColor: "bg-amber-500/20 text-amber-400" },
    { key: "flagged", label: "Flagged", count: flaggedEntries.length, badgeColor: "bg-rose-500/20 text-rose-400" },
    { key: "approved", label: "Approved" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Timesheets</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Review and approve employee time entries</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">
          <Plus size={15} /> Manual Entry
        </button>
      </div>

      <div className="mt-5 flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${tab === t.key ? "shadow-sm" : ""}`}
            style={{ backgroundColor: tab === t.key ? "var(--tt-card-bg)" : "transparent", color: tab === t.key ? "var(--tt-text-primary)" : "var(--tt-text-muted)" }}>
            {t.label}
            {(t.count ?? 0) > 0 && <span className={`ml-1.5 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${t.badgeColor}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        pendingGroups.length === 0
          ? <EmptyState text="No timesheets pending review" sub="Completed shifts will appear here for approval" />
          : <motion.div variants={container} initial="hidden" animate="show" className="mt-4 space-y-3">
              {pendingGroups.map((g) => <EmployeeCard key={g.profileId} group={g} rate={rateMap.get(g.profileId) ?? 0} dept={g.deptId ? deptMap.get(g.deptId) : undefined} orgId={organizationId} onAction={() => router.refresh()} onEdit={openEdit} mode="pending" />)}
            </motion.div>
      )}

      {tab === "flagged" && (
        flaggedGroups.length === 0
          ? <EmptyState text="No flagged entries" sub="Flagged time entries will appear here" />
          : <motion.div variants={container} initial="hidden" animate="show" className="mt-4 space-y-3">
              {flaggedGroups.map((g) => <EmployeeCard key={g.profileId} group={g} rate={rateMap.get(g.profileId) ?? 0} dept={g.deptId ? deptMap.get(g.deptId) : undefined} orgId={organizationId} onAction={() => router.refresh()} onEdit={openEdit} mode="flagged" />)}
            </motion.div>
      )}

      {tab === "approved" && (
        approvedGroups.length === 0
          ? <EmptyState text="No recently approved timesheets" sub="Approved entries from the last 7 days will show here" />
          : <motion.div variants={container} initial="hidden" animate="show" className="mt-4 space-y-3">
              {approvedGroups.map((g) => <EmployeeCard key={g.profileId} group={g} rate={rateMap.get(g.profileId) ?? 0} dept={g.deptId ? deptMap.get(g.deptId) : undefined} orgId={organizationId} onAction={() => router.refresh()} onEdit={openEdit} mode="approved" />)}
            </motion.div>
      )}

      <ManualEntrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={editingEntry ? "edit" : "add"}
        employees={employees}
        payRates={payRates}
        existing={editingEntry}
        adderName={adderName}
        onAdd={async (p) => {
          // Build ISO timestamps from local date/time + overnight flag
          const [y, m, d] = p.date.split("-").map(Number);
          const [ih, im] = p.clockInTime.split(":").map(Number);
          const [oh, om] = p.clockOutTime.split(":").map(Number);
          const inDate = new Date(y, (m ?? 1) - 1, (d ?? 1), ih ?? 0, im ?? 0);
          const outDate = new Date(y, (m ?? 1) - 1, (d ?? 1) + (p.overnight ? 1 : 0), oh ?? 0, om ?? 0);
          const r = await addManualEntry({
            profileId: p.profileId,
            organizationId,
            clockIn: inDate.toISOString(),
            clockOut: outDate.toISOString(),
            breakMinutes: p.breakMinutes,
            notes: p.notes,
          });
          if (r.success) router.refresh();
          return { success: r.success, error: r.error };
        }}
        onEdit={async (p) => {
          const r = await editTimeEntry({ entryId: p.entryId, clockIn: p.clockIn, clockOut: p.clockOut, breakMinutes: p.breakMinutes, notes: p.notes });
          if (r.success) router.refresh();
          return r;
        }}
        onDelete={async (id) => {
          const r = await deleteTimeEntry(id);
          if (r.success) router.refresh();
          return r;
        }}
      />
    </motion.div>
  );
}

function EmployeeCard({ group, rate, dept, orgId, onAction, onEdit, mode }: {
  group: { profileId: string; name: string; entries: Entry[] }; rate: number; dept?: string; orgId: string; onAction: () => void; onEdit: (e: Entry) => void; mode: "pending" | "approved" | "flagged";
}) {
  const [expanded, setExpanded] = useState(mode === "flagged");
  const [approving, setApproving] = useState(false);
  const totalHours = group.entries.reduce((s, e) => s + (e.total_hours ?? 0), 0);

  async function handleApproveAll() {
    setApproving(true);
    const r = await approveAllForEmployee(group.profileId, orgId);
    setApproving(false);
    r.success ? (toast.success(`Approved ${r.count} entries`), onAction()) : toast.error(r.error || "Failed");
  }

  return (
    <motion.div variants={rise} className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}>
      <div onClick={() => setExpanded(!expanded)} className="flex w-full cursor-pointer items-center justify-between px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">{getInitials(group.name.split(" ")[0], group.name.split(" ")[1])}</div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{group.name}</p>
            <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{dept ?? ""} · {group.entries.length} entries</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="font-mono text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{formatHours(totalHours)}</p>
            {rate > 0 && <p className="font-mono text-xs text-emerald-400">${(totalHours * rate).toFixed(2)}</p>}
          </div>
          {mode === "pending" && <Button onClick={(e) => { e.stopPropagation(); handleApproveAll(); }} disabled={approving} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20">{approving ? "..." : "Approve All"}</Button>}
          {expanded ? <ChevronUp size={16} style={{ color: "var(--tt-text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--tt-text-muted)" }} />}
        </div>
      </div>
      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.2 }}>
          <div style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
            {group.entries.map((entry) => <EntryRow key={entry.id} entry={entry} rate={rate} onAction={onAction} onEdit={onEdit} mode={mode} />)}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function EntryRow({ entry, rate, onAction, onEdit, mode }: { entry: Entry; rate: number; onAction: () => void; onEdit: (e: Entry) => void; mode: "pending" | "approved" | "flagged" }) {
  const [loading, setLoading] = useState<string | null>(null);
  const hours = entry.total_hours ?? 0;
  const breakMin = entry.total_break_minutes ?? 0;

  async function handleAction(action: () => Promise<{ success: boolean; error?: string }>, label: string) {
    setLoading(label);
    const r = await action();
    setLoading(null);
    r.success ? (toast.success(label), onAction()) : toast.error(r.error || "Failed");
  }

  return (
    <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-20 shrink-0">
            <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>{format(new Date(entry.clock_in), "MMM d")}</p>
            <p className="text-[11px]" style={{ color: "var(--tt-text-muted)" }}>{format(new Date(entry.clock_in), "EEE")}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>
              {format(new Date(entry.clock_in), "h:mm a")}
              {entry.clock_in_on_site != null && <MapPin size={10} className="mx-0.5 inline" style={{ color: entry.clock_in_on_site ? "#34D399" : "#FB7185" }} />}
              {" → "}{entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "—"}
              {entry.clock_out_on_site != null && <MapPin size={10} className="mx-0.5 inline" style={{ color: entry.clock_out_on_site ? "#34D399" : "#FB7185" }} />}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-xs" style={{ color: "var(--tt-text-primary)" }}>{formatHours(hours)}</span>
              {breakMin > 0 && <span className="text-[11px]" style={{ color: "var(--tt-text-muted)" }}>({breakMin}m break)</span>}
              {rate > 0 && <span className="font-mono text-[11px] text-emerald-400">${(hours * rate).toFixed(2)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {mode === "pending" && (
            <>
              <button onClick={() => handleAction(() => approveTimeEntry(entry.id), "Approved")} disabled={!!loading} className="flex size-7 items-center justify-center rounded-md text-emerald-400 transition-colors hover:bg-emerald-500/10"><CheckCircle size={16} /></button>
              <button onClick={() => handleAction(() => flagTimeEntry(entry.id, "Flagged for review"), "Flagged")} disabled={!!loading} className="flex size-7 items-center justify-center rounded-md text-amber-400 transition-colors hover:bg-amber-500/10"><AlertTriangle size={16} /></button>
            </>
          )}
          {mode === "flagged" && (
            <>
              <button onClick={() => handleAction(() => approveTimeEntry(entry.id), "Approved")} disabled={!!loading} className="flex size-7 items-center justify-center rounded-md text-emerald-400 transition-colors hover:bg-emerald-500/10" title="Approve anyway"><CheckCircle size={16} /></button>
              <button onClick={() => handleAction(() => unflagTimeEntry(entry.id), "Unflagged")} disabled={!!loading} className="flex size-7 items-center justify-center rounded-md text-indigo-400 transition-colors hover:bg-indigo-500/10" title="Return to pending"><Undo2 size={16} /></button>
              <button onClick={() => handleAction(() => deleteTimeEntry(entry.id), "Deleted")} disabled={!!loading} className="flex size-7 items-center justify-center rounded-md text-rose-400 transition-colors hover:bg-rose-500/10" title="Delete entry"><Trash2 size={16} /></button>
            </>
          )}
          {mode === "approved" && entry.approved_at && <span className="text-[11px]" style={{ color: "var(--tt-text-muted)" }}>Approved {format(new Date(entry.approved_at), "MMM d")}</span>}
          <button onClick={() => onEdit(entry)} className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--tt-elevated-bg)]" style={{ color: "var(--tt-text-muted)" }} title="Edit entry"><PenSquare size={14} /></button>
        </div>
      </div>
      {/* Flag note */}
      {mode === "flagged" && entry.notes && (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-400">Flag note: {entry.notes}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="mt-12 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <FileText size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
      <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{text}</p>
      <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>{sub}</p>
    </div>
  );
}
