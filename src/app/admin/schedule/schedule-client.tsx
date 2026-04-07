"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Send, Calendar, ChevronDown, Repeat } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { getInitials, parseLocalDate } from "@/lib/utils";
import { publishSchedule, getWeekSchedules, getMonthSchedules, getPTOForRange } from "./actions";
import { AddShiftSheet } from "./add-shift-sheet";
import { RecurringShiftSheet } from "./recurring-shift-sheet";

interface Schedule { id: string; profile_id: string; start_time: string; end_time: string; is_published: boolean; notes: string | null; department_id: string | null }
interface Employee { id: string; first_name: string | null; last_name: string | null; department_id: string | null }
interface Department { id: string; name: string; color: string }
interface PTOReq { profile_id: string; start_date: string; end_date: string; pto_policies: { name: string } | null }

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

type View = "week" | "month";

export function ScheduleClient({ schedules: initialSchedules, employees, departments, ptoRequests, organizationId, initialWeekStart }: {
  schedules: Schedule[]; employees: Employee[]; departments: Department[]; ptoRequests: PTOReq[]; organizationId: string; initialWeekStart: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [weekStartStr, setWeekStartStr] = useState(initialWeekStart);
  const [monthDate, setMonthDate] = useState(new Date());
  const [schedules, setSchedules] = useState(initialSchedules);
  const [ptoReqs, setPtoReqs] = useState(ptoRequests);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillEmp, setPrefillEmp] = useState<string | undefined>();
  const [editShift, setEditShift] = useState<Schedule | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [mobileDay, setMobileDay] = useState<number | null>(null);

  const weekStart = new Date(weekStartStr);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach((d) => m.set(d.id, d));
    return m;
  }, [departments]);

  const empMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const unpublishedCount = schedules.filter((s) => !s.is_published).length;

  const ptoMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const req of ptoReqs) {
      try {
        const start = parseLocalDate(req.start_date);
        const end = parseLocalDate(req.end_date);
        for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
          m.set(`${req.profile_id}_${format(d, "yyyy-MM-dd")}`, req.pto_policies?.name ?? "PTO");
        }
      } catch {}
    }
    return m;
  }, [ptoReqs]);

  async function navigateWeek(offset: number) {
    const ns = addDays(weekStart, offset * 7);
    const ne = addDays(ns, 6);
    setWeekStartStr(ns.toISOString());
    const [s, p] = await Promise.all([
      getWeekSchedules(organizationId, ns.toISOString(), ne.toISOString()),
      getPTOForRange(organizationId, ns.toISOString(), ne.toISOString()),
    ]);
    setSchedules(s);
    setPtoReqs(p as any);
  }

  async function navigateMonth(offset: number) {
    const nm = addMonths(monthDate, offset);
    setMonthDate(nm);
    const ms = startOfMonth(nm);
    const me = endOfMonth(nm);
    const [s, p] = await Promise.all([
      getMonthSchedules(organizationId, ms.toISOString(), me.toISOString()),
      getPTOForRange(organizationId, ms.toISOString(), me.toISOString()),
    ]);
    setSchedules(s);
    setPtoReqs(p as any);
  }

  async function handlePublish() {
    setPublishing(true);
    const r = await publishSchedule(organizationId);
    setPublishing(false);
    if (r.success) {
      toast.success(`Published ${r.count} shifts`);
      await refreshData();
    } else toast.error(r.error || "Failed");
  }

  async function refreshData() {
    if (view === "week") {
      setSchedules(await getWeekSchedules(organizationId, weekStart.toISOString(), addDays(weekStart, 6).toISOString()));
    } else {
      const ms = startOfMonth(monthDate);
      setSchedules(await getMonthSchedules(organizationId, ms.toISOString(), endOfMonth(monthDate).toISOString()));
    }
    router.refresh();
  }

  function openAdd(date?: string, empId?: string) {
    setPrefillDate(date); setPrefillEmp(empId); setEditShift(null); setSheetOpen(true);
  }
  function openEdit(shift: Schedule) {
    setEditShift(shift); setPrefillDate(undefined); setPrefillEmp(undefined); setSheetOpen(true);
  }

  function getShiftsForCell(empId: string, day: Date) {
    return schedules.filter((s) => s.profile_id === empId && format(new Date(s.start_time), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
  }

  // Month calendar dates
  const monthCalDays = useMemo(() => {
    const ms = startOfMonth(monthDate);
    const me = endOfMonth(monthDate);
    const calStart = startOfWeek(ms, { weekStartsOn: 0 });
    const calEnd = addDays(calStart, 41); // 6 rows × 7 days
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [monthDate]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Schedule</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg p-0.5" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
            {(["week", "month"] as View[]).map((v) => (
              <button key={v} onClick={() => { setView(v); if (v === "month") navigateMonth(0); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${view === v ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : ""}`}
                style={view !== v ? { color: "var(--tt-text-muted)", border: "1px solid transparent" } : {}}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setRecurringOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)", border: "1px solid var(--tt-border-subtle)" }}>
            <Repeat size={14} /> Recurring
          </button>
          <button onClick={() => openAdd()} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600">
            <Plus size={14} /> Add Shift
          </button>
          {unpublishedCount > 0 && (
            <button onClick={handlePublish} disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600">
              <Send size={12} /> {publishing ? "..." : `Publish (${unpublishedCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button onClick={() => view === "week" ? navigateWeek(-1) : navigateMonth(-1)} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-[180px] text-center text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>
          {view === "week" ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}` : format(monthDate, "MMMM yyyy")}
        </p>
        <button onClick={() => view === "week" ? navigateWeek(1) : navigateMonth(1)} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === "week" ? (
          <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Desktop week grid */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <div className="min-w-[900px] rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <div className="grid grid-cols-[180px_repeat(7,1fr)]" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                  <div className="px-4 py-3" style={{ borderRight: "1px solid var(--tt-border-faint)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--tt-text-muted)" }}>Employee</span>
                  </div>
                  {days.map((d, i) => (
                    <div key={i} className="px-2 py-3 text-center" style={{ borderRight: i < 6 ? "1px solid var(--tt-border-faint)" : undefined, backgroundColor: isToday(d) ? "rgba(99,102,241,0.03)" : undefined }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: isToday(d) ? "#818CF8" : "var(--tt-text-muted)" }}>{format(d, "EEE")}</p>
                      <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{format(d, "d")}</p>
                    </div>
                  ))}
                </div>
                {employees.map((emp) => {
                  const dept = emp.department_id ? deptMap.get(emp.department_id) : undefined;
                  return (
                    <div key={emp.id} className="grid grid-cols-[180px_repeat(7,1fr)]" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                      <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: "1px solid var(--tt-border-faint)" }}>
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">{getInitials(emp.first_name ?? undefined, emp.last_name ?? undefined)}</div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>{capitalize(emp.first_name)} {capitalize(emp.last_name)}</p>
                          {dept && <p className="truncate text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{dept.name}</p>}
                        </div>
                      </div>
                      {days.map((d, i) => {
                        const shifts = getShiftsForCell(emp.id, d);
                        const dateStr = format(d, "yyyy-MM-dd");
                        const ptoName = ptoMap.get(`${emp.id}_${dateStr}`);
                        return (
                          <div key={i} className="group relative min-h-[60px] px-1 py-1" style={{ borderRight: i < 6 ? "1px solid var(--tt-border-faint)" : undefined, backgroundColor: isToday(d) ? "rgba(99,102,241,0.03)" : undefined }}>
                            {ptoName && <div className="mb-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-amber-400" style={{ backgroundColor: "rgba(251,191,36,0.1)" }}>{ptoName}</div>}
                            {shifts.map((s) => {
                              const dc = s.department_id ? deptMap.get(s.department_id)?.color : undefined;
                              return (
                                <button key={s.id} onClick={() => openEdit(s)} className={`mb-1 w-full rounded-md px-1.5 py-1 text-left transition-all hover:opacity-80 ${s.is_published ? "" : "border-dashed opacity-70"}`}
                                  style={{ backgroundColor: "rgba(99,102,241,0.1)", border: `1px ${s.is_published ? "solid" : "dashed"} rgba(99,102,241,0.25)`, borderLeftWidth: 2, borderLeftColor: dc ?? "#818CF8" }}>
                                  <p className="font-mono text-[10px]" style={{ color: "var(--tt-text-primary)" }}>{format(new Date(s.start_time), "h:mma")}–{format(new Date(s.end_time), "h:mma")}</p>
                                </button>
                              );
                            })}
                            {!ptoName && <button onClick={() => openAdd(dateStr, emp.id)} className="flex size-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--tt-text-faint)" }}><Plus size={12} /></button>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {employees.length === 0 && (
                  <div className="flex flex-col items-center py-16">
                    <Calendar size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
                    <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>Add employees first to create schedules</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile week accordion */}
            <div className="mt-4 space-y-2 md:hidden">
              {days.map((d, i) => {
                const dayShifts = schedules.filter((s) => format(new Date(s.start_time), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
                const isOpen = mobileDay === i;
                return (
                  <div key={i} className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                    <button onClick={() => setMobileDay(isOpen ? null : i)} className="flex w-full items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isToday(d) && <span className="size-1.5 rounded-full bg-indigo-400" />}
                        <span className="text-sm font-medium" style={{ color: isToday(d) ? "#818CF8" : "var(--tt-text-primary)" }}>{format(d, "EEE, MMM d")}</span>
                        <span className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{dayShifts.length} shifts</span>
                      </div>
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--tt-text-muted)" }} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                          <div style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
                            {dayShifts.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>No shifts</p>
                                <button onClick={() => openAdd(format(d, "yyyy-MM-dd"))} className="mt-2 text-xs text-indigo-400">+ Add shift</button>
                              </div>
                            ) : dayShifts.map((s) => {
                              const emp = empMap.get(s.profile_id);
                              return (
                                <button key={s.id} onClick={() => openEdit(s)} className="flex w-full items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">{getInitials(emp?.first_name ?? undefined, emp?.last_name ?? undefined)}</div>
                                  <div className="text-left">
                                    <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{capitalize(emp?.first_name)} {capitalize(emp?.last_name)}</p>
                                    <p className="font-mono text-xs" style={{ color: "var(--tt-text-muted)" }}>{format(new Date(s.start_time), "h:mm a")} – {format(new Date(s.end_time), "h:mm a")}</p>
                                  </div>
                                  {!s.is_published && <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">Draft</span>}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Month view */
          <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="mt-4 rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              {/* Day headers */}
              <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase" style={{ color: "var(--tt-text-muted)" }}>{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {monthCalDays.map((d, i) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const daySchedules = schedules.filter((s) => format(new Date(s.start_time), "yyyy-MM-dd") === dateStr);
                  const inMonth = isSameMonth(d, monthDate);
                  const today = isToday(d);
                  return (
                    <div key={i} className="group min-h-[80px] px-1 py-1" style={{
                      borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--tt-border-faint)" : undefined,
                      borderBottom: "1px solid var(--tt-border-faint)",
                      backgroundColor: today ? "rgba(99,102,241,0.03)" : !inMonth ? "rgba(0,0,0,0.02)" : undefined,
                      opacity: inMonth ? 1 : 0.4,
                    }}>
                      <div className="flex items-center justify-between px-1">
                        <span className={`text-xs font-medium ${today ? "text-indigo-400" : ""}`} style={today ? {} : { color: "var(--tt-text-tertiary)" }}>{format(d, "d")}</span>
                        {inMonth && daySchedules.length === 0 && (
                          <button onClick={() => openAdd(dateStr)} className="flex size-4 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--tt-text-faint)" }}><Plus size={10} /></button>
                        )}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {/* PTO indicators */}
                        {employees.filter((emp) => ptoMap.get(`${emp.id}_${dateStr}`)).slice(0, 2).map((emp) => {
                          const ptoName = ptoMap.get(`${emp.id}_${dateStr}`)!;
                          const initials = getInitials(emp.first_name ?? undefined, emp.last_name ?? undefined);
                          return (
                            <div key={`pto-${emp.id}`} className="flex w-full items-center gap-1 rounded px-0.5 py-0.5" style={{ backgroundColor: "rgba(251,191,36,0.1)", borderLeft: "2px solid #FBBF24" }}>
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[7px] font-bold text-amber-400">{initials}</span>
                              <span className="truncate text-[8px] text-amber-400">PTO</span>
                            </div>
                          );
                        })}
                        {daySchedules.slice(0, 3).map((s) => {
                          const emp = empMap.get(s.profile_id);
                          const initials = getInitials(emp?.first_name ?? undefined, emp?.last_name ?? undefined);
                          const dc = s.department_id ? deptMap.get(s.department_id)?.color : "#818CF8";
                          return (
                            <button key={s.id} onClick={() => openEdit(s)} className="flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left transition-opacity hover:opacity-80"
                              style={{ backgroundColor: "rgba(99,102,241,0.08)", borderLeft: `2px solid ${dc}` }}>
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[7px] font-bold text-white">{initials}</span>
                              <span className="truncate font-mono text-[8px]" style={{ color: "var(--tt-text-tertiary)" }}>{format(new Date(s.start_time), "h:mma")}</span>
                            </button>
                          );
                        })}
                        {daySchedules.length > 3 && <p className="px-1 text-[8px]" style={{ color: "var(--tt-text-muted)" }}>+{daySchedules.length - 3} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddShiftSheet open={sheetOpen} onOpenChange={setSheetOpen} employees={employees} departments={departments} organizationId={organizationId}
        prefillDate={prefillDate} prefillEmployee={prefillEmp} editShift={editShift} onSuccess={refreshData} />
      <RecurringShiftSheet open={recurringOpen} onOpenChange={setRecurringOpen} employees={employees} departments={departments}
        organizationId={organizationId} onSuccess={refreshData} />
    </motion.div>
  );
}
