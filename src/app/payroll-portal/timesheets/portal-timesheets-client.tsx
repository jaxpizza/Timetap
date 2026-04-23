"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Clock, FileText, ChevronDown, ChevronUp, Undo2, MapPin, Plus, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatHours, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { approveTimeEntry, approveAllForEmployee, flagTimeEntry, unflagTimeEntry, addManualEntryAsProvider, editTimeEntryAsProvider, deleteTimeEntryAsProvider } from "./actions";
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

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function groupByEmployee(entries: Entry[]) {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const arr = map.get(e.profile_id) ?? [];
    arr.push(e);
    map.set(e.profile_id, arr);
  }
  return Array.from(map.entries());
}

interface Employee { id: string; first_name: string | null; last_name: string | null; email: string }

export function PortalTimesheetsClient({
  orgId, orgName, pendingEntries, approvedEntries, flaggedEntries, payRates, departments, employees = [], adderName = "Payroll Provider",
}: {
  orgId: string;
  orgName: string;
  pendingEntries: Entry[];
  approvedEntries: Entry[];
  flaggedEntries: Entry[];
  payRates: PayRate[];
  departments: Department[];
  employees?: Employee[];
  adderName?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "approved" | "flagged">("pending");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntryExisting | null>(null);

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

  const rateMap = new Map<string, PayRate>();
  for (const r of payRates) rateMap.set(r.profile_id, r);
  const deptMap = new Map<string, string>();
  for (const d of departments) deptMap.set(d.id, d.name);

  const data = tab === "pending" ? pendingEntries : tab === "approved" ? approvedEntries : flaggedEntries;
  const grouped = groupByEmployee(data);

  async function handleApprove(id: string) {
    const r = await approveTimeEntry(orgId, id);
    r.success ? toast.success("Entry approved") : toast.error(r.error || "Failed");
    router.refresh();
  }

  async function handleApproveAll(profileId: string) {
    const r = await approveAllForEmployee(orgId, profileId);
    r.success ? toast.success(`Approved ${r.count} entries`) : toast.error(r.error || "Failed");
    router.refresh();
  }

  async function handleFlag(id: string) {
    const note = prompt("Flag reason:");
    if (!note) return;
    const r = await flagTimeEntry(orgId, id, note);
    r.success ? toast.success("Entry flagged") : toast.error(r.error || "Failed");
    router.refresh();
  }

  async function handleUnflag(id: string) {
    const r = await unflagTimeEntry(orgId, id);
    r.success ? toast.success("Flag cleared") : toast.error(r.error || "Failed");
    router.refresh();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Timesheets</h1>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Review</span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>{orgName}</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600">
          <Plus size={13} /> Manual Entry
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        <TabButton label="Pending Review" count={pendingEntries.length} active={tab === "pending"} onClick={() => setTab("pending")} />
        <TabButton label="Approved (7d)" count={approvedEntries.length} active={tab === "approved"} onClick={() => setTab("approved")} />
        <TabButton label="Flagged" count={flaggedEntries.length} active={tab === "flagged"} onClick={() => setTab("flagged")} />
      </div>

      {/* Body */}
      {grouped.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-xl py-12" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <FileText size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>
            {tab === "pending" ? "All caught up!" : tab === "approved" ? "No recent approvals" : "Nothing flagged"}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {grouped.map(([profileId, entries]) => (
            <EmployeeGroup
              key={profileId}
              profileId={profileId}
              entries={entries}
              rate={rateMap.get(profileId)}
              deptMap={deptMap}
              tab={tab}
              onApprove={handleApprove}
              onApproveAll={handleApproveAll}
              onFlag={handleFlag}
              onUnflag={handleUnflag}
              onEdit={openEdit}
            />
          ))}
        </div>
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
          const [y, m, d] = p.date.split("-").map(Number);
          const [ih, im] = p.clockInTime.split(":").map(Number);
          const [oh, om] = p.clockOutTime.split(":").map(Number);
          const inDate = new Date(y, (m ?? 1) - 1, (d ?? 1), ih ?? 0, im ?? 0);
          const outDate = new Date(y, (m ?? 1) - 1, (d ?? 1) + (p.overnight ? 1 : 0), oh ?? 0, om ?? 0);
          const r = await addManualEntryAsProvider({
            organizationId: orgId,
            profileId: p.profileId,
            clockIn: inDate.toISOString(),
            clockOut: outDate.toISOString(),
            breakMinutes: p.breakMinutes,
            notes: p.notes,
          });
          if (r.success) router.refresh();
          return { success: r.success, error: r.error };
        }}
        onEdit={async (p) => {
          const r = await editTimeEntryAsProvider({
            organizationId: orgId,
            entryId: p.entryId,
            clockIn: p.clockIn,
            clockOut: p.clockOut,
            breakMinutes: p.breakMinutes,
            notes: p.notes,
          });
          if (r.success) router.refresh();
          return r;
        }}
        onDelete={async (id) => {
          const r = await deleteTimeEntryAsProvider(orgId, id);
          if (r.success) router.refresh();
          return r;
        }}
      />
    </motion.div>
  );
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${active ? "shadow-sm" : ""}`}
      style={{
        backgroundColor: active ? "var(--tt-card-bg)" : "transparent",
        color: active ? "var(--tt-text-primary)" : "var(--tt-text-muted)",
      }}
    >
      {label}
      {count > 0 && (
        <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-400">{count}</span>
      )}
    </button>
  );
}

function EmployeeGroup({
  profileId, entries, rate, deptMap, tab, onApprove, onApproveAll, onFlag, onUnflag, onEdit,
}: {
  profileId: string;
  entries: Entry[];
  rate?: PayRate;
  deptMap: Map<string, string>;
  tab: "pending" | "approved" | "flagged";
  onApprove: (id: string) => void;
  onApproveAll: (profileId: string) => void;
  onFlag: (id: string) => void;
  onUnflag: (id: string) => void;
  onEdit: (e: Entry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const p = entries[0]?.profiles;
  const name = `${capitalize(p?.first_name)} ${capitalize(p?.last_name)}`.trim() || "Employee";
  const dept = p?.department_id ? deptMap.get(p.department_id) : undefined;
  const totalHours = entries.reduce((s, e) => s + (Number(e.total_hours) || 0), 0);
  const hourlyRate = rate ? (rate.type === "salary" ? Number(rate.rate) / 2080 : Number(rate.rate)) : 0;
  const totalPay = totalHours * hourlyRate;

  return (
    <div className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
            {getInitials(p?.first_name ?? undefined, p?.last_name ?? undefined)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{name}</p>
            <p className="text-[11px]" style={{ color: "var(--tt-text-muted)" }}>{dept ?? "—"} · {entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{formatHours(totalHours)}</p>
            {hourlyRate > 0 && <p className="font-mono text-[10px] text-emerald-400">{$(totalPay)}</p>}
          </div>
          {tab === "pending" && entries.length > 1 && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onApproveAll(profileId); }} className="h-7 bg-emerald-500/15 text-[11px] text-emerald-400 hover:bg-emerald-500/25">
              Approve All
            </Button>
          )}
          {expanded ? <ChevronUp size={14} style={{ color: "var(--tt-text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--tt-text-muted)" }} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t" style={{ borderColor: "var(--tt-border-faint)" }}>
          {entries.map((e, i) => (
            <EntryRow key={e.id} entry={e} hourlyRate={hourlyRate} tab={tab} onApprove={onApprove} onFlag={onFlag} onUnflag={onUnflag} onEdit={onEdit}
              last={i === entries.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, hourlyRate, tab, onApprove, onFlag, onUnflag, onEdit, last }: {
  entry: Entry;
  hourlyRate: number;
  tab: "pending" | "approved" | "flagged";
  onApprove: (id: string) => void;
  onFlag: (id: string) => void;
  onUnflag: (id: string) => void;
  onEdit: (e: Entry) => void;
  last: boolean;
}) {
  const hrs = Number(entry.total_hours ?? 0);
  const pay = hrs * hourlyRate;

  return (
    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: last ? undefined : "1px solid var(--tt-border-faint)" }}>
      <div className="flex items-center gap-3">
        <p className="font-mono text-xs" style={{ color: "var(--tt-text-tertiary)" }}>
          {format(new Date(entry.clock_in), "MMM d")}
        </p>
        <p className="font-mono text-xs" style={{ color: "var(--tt-text-secondary)" }}>
          {format(new Date(entry.clock_in), "h:mma")} – {entry.clock_out ? format(new Date(entry.clock_out), "h:mma") : "—"}
        </p>
        {(entry.clock_in_on_site === false || entry.clock_out_on_site === false) && (
          <MapPin size={11} className="text-amber-400" />
        )}
        {entry.notes && tab === "flagged" && (
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300">{entry.notes}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-mono text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>{formatHours(hrs)}</p>
          {hourlyRate > 0 && <p className="font-mono text-[10px] text-emerald-400">{$(pay)}</p>}
        </div>
        {tab === "pending" && (
          <div className="flex items-center gap-1">
            <button onClick={() => onApprove(entry.id)} className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/20" title="Approve">
              <CheckCircle size={12} />
            </button>
            <button onClick={() => onFlag(entry.id)} className="rounded-md bg-amber-500/10 p-1.5 text-amber-400 transition-colors hover:bg-amber-500/20" title="Flag">
              <AlertTriangle size={12} />
            </button>
          </div>
        )}
        {tab === "flagged" && (
          <button onClick={() => onUnflag(entry.id)} className="flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-500/20">
            <Undo2 size={10} /> Unflag
          </button>
        )}
        {tab === "approved" && entry.approved_at && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle size={10} /> {format(new Date(entry.approved_at), "MMM d")}
          </span>
        )}
        <button onClick={() => onEdit(entry)} className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--tt-elevated-bg)]" style={{ color: "var(--tt-text-muted)" }} title="Edit entry">
          <PenSquare size={12} />
        </button>
      </div>
    </div>
  );
}
