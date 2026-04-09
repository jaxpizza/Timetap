"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Palmtree, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { getEmployeeSchedules, getEmployeePTO } from "./actions";
import { ShiftDetailSheet, type SelectedItem } from "./shift-detail-sheet";

interface Shift { id: string; start_time: string; end_time: string; department_id: string | null; notes: string | null; departments: { name: string; color: string } | null }
interface PTOReq { id: string; pto_policy_id: string; start_date: string; end_date: string; total_hours: number; status: string; pto_policies: { name: string; color: string } | null }

type View = "week" | "month";

function buildPTOMap(reqs: PTOReq[]) {
  const m = new Map<string, { name: string; color: string; req: PTOReq }>();
  for (const req of reqs) {
    try {
      const days = eachDayOfInterval({ start: parseLocalDate(req.start_date), end: parseLocalDate(req.end_date) });
      for (const d of days) m.set(format(d, "yyyy-MM-dd"), { name: req.pto_policies?.name ?? "PTO", color: req.pto_policies?.color ?? "#FBBF24", req });
    } catch {}
  }
  return m;
}

export function ScheduleClient({ schedules: initial, ptoRequests: initialPTO, weekStartIso }: {
  schedules: Shift[]; ptoRequests: PTOReq[]; weekStartIso: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [schedules, setSchedules] = useState(initial);
  const [ptoReqs, setPtoReqs] = useState(initialPTO);
  const [weekStart, setWeekStart] = useState(new Date(weekStartIso));
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(item: SelectedItem) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  const ptoDays = useMemo(() => buildPTOMap(ptoReqs), [ptoReqs]);
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function loadRange(start: Date, end: Date) {
    const [s, p] = await Promise.all([
      getEmployeeSchedules(start.toISOString(), end.toISOString()),
      getEmployeePTO(start.toISOString(), end.toISOString()),
    ]);
    setSchedules(s as any); setPtoReqs(p as any);
  }

  async function navWeek(off: number) {
    const ns = addDays(weekStart, off * 7);
    setWeekStart(ns);
    await loadRange(ns, addDays(ns, 13));
  }

  async function navMonth(off: number) {
    const nm = addMonths(monthDate, off);
    setMonthDate(nm);
    await loadRange(startOfMonth(nm), endOfMonth(nm));
  }

  const monthCalDays = useMemo(() => {
    const ms = startOfMonth(monthDate);
    const me = endOfMonth(monthDate);
    const cs = startOfWeek(ms, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: cs, end: addDays(me, 6 - me.getDay() || 0) }).slice(0, 42);
  }, [monthDate]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold" style={{ color: "var(--tt-text-primary)" }}>My Schedule</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            {view === "month" ? format(monthDate, "MMMM yyyy") : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg p-0.5" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
          {(["week", "month"] as View[]).map((v) => (
            <button key={v} onClick={async () => {
              setView(v);
              if (v === "month") await navMonth(0);
              else await navWeek(0);
            }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-all ${view === v ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : ""}`}
              style={view !== v ? { color: "var(--tt-text-muted)", border: "1px solid transparent" } : {}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* WEEK VIEW */}
        {view === "week" && (
          <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NavRow label={`${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`} onPrev={() => navWeek(-1)} onNext={() => navWeek(1)} />
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {days7.map((d) => {
                const dateStr = format(d, "yyyy-MM-dd");
                const dayShifts = schedules.filter((s) => format(new Date(s.start_time), "yyyy-MM-dd") === dateStr);
                const pto = ptoDays.get(dateStr);
                const today = isToday(d);
                return (
                  <div key={dateStr} className="rounded-lg p-2" style={{
                    backgroundColor: today ? "rgba(99,102,241,0.05)" : "var(--tt-card-bg)",
                    border: `1px solid ${today ? "rgba(99,102,241,0.2)" : "var(--tt-border-subtle)"}`,
                    minHeight: 80,
                  }}>
                    <p className="text-[10px] font-semibold" style={{ color: today ? "#818CF8" : "var(--tt-text-muted)" }}>{format(d, "EEE d")}</p>
                    {pto && <div onClick={() => openDetail({ kind: "pto", date: d, ptoName: pto.name, ptoColor: pto.color, req: pto.req })} role="button" tabIndex={0} className="mt-1 cursor-pointer rounded px-1 py-0.5 text-[9px] text-amber-400 transition-opacity hover:opacity-80" style={{ backgroundColor: "rgba(251,191,36,0.1)" }}>{pto.name}</div>}
                    {dayShifts.map((s) => (
                      <div key={s.id} onClick={() => openDetail({ kind: "shift", shift: s, date: d })} role="button" tabIndex={0} className="mt-1 cursor-pointer rounded px-1.5 py-0.5 transition-opacity hover:opacity-80" style={{ backgroundColor: "rgba(99,102,241,0.08)", borderLeft: `2px solid ${s.departments?.color ?? "#818CF8"}` }}>
                        <p className="font-mono text-[9px]" style={{ color: "var(--tt-text-primary)" }}>{format(new Date(s.start_time), "h:mma")}–{format(new Date(s.end_time), "h:mma")}</p>
                      </div>
                    ))}
                    {dayShifts.length === 0 && !pto && <p className="mt-2 text-center text-[9px]" style={{ color: "var(--tt-text-faint)" }}>—</p>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* MONTH VIEW */}
        {view === "month" && (
          <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NavRow label={format(monthDate, "MMMM yyyy")} onPrev={() => navMonth(-1)} onNext={() => navMonth(1)} />
            <div className="mt-3 rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                  <div key={i} className="py-2 text-center text-[10px] font-semibold" style={{ color: "var(--tt-text-muted)" }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCalDays.map((d, i) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const dayShifts = schedules.filter((s) => format(new Date(s.start_time), "yyyy-MM-dd") === dateStr);
                  const pto = ptoDays.get(dateStr);
                  const inMonth = isSameMonth(d, monthDate);
                  const today = isToday(d);
                  return (
                    <div key={i} className="min-h-[70px] px-1 py-1 sm:min-h-[80px]" style={{
                      borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--tt-border-faint)" : undefined,
                      borderBottom: "1px solid var(--tt-border-faint)",
                      opacity: inMonth ? 1 : 0.3,
                      backgroundColor: today ? "rgba(99,102,241,0.04)" : undefined,
                    }}>
                      <span className={`text-[10px] font-semibold ${today ? "inline-flex size-5 items-center justify-center rounded-full bg-indigo-500 text-white" : ""}`}
                        style={today ? {} : { color: "var(--tt-text-tertiary)" }}>
                        {format(d, "d")}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {pto && (
                          <div onClick={() => openDetail({ kind: "pto", date: d, ptoName: pto.name, ptoColor: pto.color, req: pto.req })} role="button" tabIndex={0}
                            className="cursor-pointer rounded px-1 py-0.5 text-[9px] font-medium text-amber-400 transition-opacity hover:opacity-80 sm:text-[10px]"
                            style={{ backgroundColor: "rgba(251,191,36,0.1)" }}>
                            PTO
                          </div>
                        )}
                        {dayShifts.map((s) => (
                          <div key={s.id} onClick={() => openDetail({ kind: "shift", shift: s, date: d })} role="button" tabIndex={0}
                            className="hidden cursor-pointer rounded px-1 py-0.5 transition-opacity hover:opacity-80 sm:block"
                            style={{ backgroundColor: "rgba(99,102,241,0.08)", borderLeft: `2px solid ${s.departments?.color ?? "#818CF8"}` }}>
                            <p className="font-mono text-[9px]" style={{ color: "var(--tt-text-primary)" }}>
                              {format(new Date(s.start_time), "h:mma")}
                            </p>
                          </div>
                        ))}
                        {/* Mobile: show count circle */}
                        {dayShifts.length > 0 && (
                          <div className="flex sm:hidden" onClick={() => openDetail({ kind: "shift", shift: dayShifts[0], date: d })} role="button" tabIndex={0}>
                            <span className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-indigo-500/20 text-[8px] font-bold text-indigo-400">
                              {dayShifts.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShiftDetailSheet item={selectedItem} open={detailOpen} onOpenChange={setDetailOpen} />
    </motion.div>
  );
}

/* ── Sub-components ── */

function NavRow({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <button onClick={onPrev} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}><ChevronLeft size={18} /></button>
      <p className="min-w-[160px] text-center text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{label}</p>
      <button onClick={onNext} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}><ChevronRight size={18} /></button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <Calendar size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
      <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No shifts scheduled</p>
      <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>Your schedule will appear here when your manager publishes it</p>
    </div>
  );
}
