"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, Clock } from "lucide-react";
import { format, startOfDay, isSameDay, isToday } from "date-fns";
import { formatHours } from "@/lib/utils";

interface Entry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  total_break_minutes: number | null;
  status: string;
  is_overtime: boolean;
  overtime_hours: number | null;
  notes: string | null;
}

interface DayGroup {
  date: Date;
  entries: Entry[];
  totalHours: number;
}

function groupByDay(entries: Entry[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of entries) {
    const d = startOfDay(new Date(e.clock_in));
    const key = d.toISOString();
    if (!map.has(key)) map.set(key, { date: d, entries: [], totalHours: 0 });
    const g = map.get(key)!;
    g.entries.push(e);
    g.totalHours += e.total_hours ?? 0;
  }
  return Array.from(map.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  completed: { label: "Pending", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  approved: { label: "Approved", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  flagged: { label: "Flagged", color: "#FB7185", bg: "rgba(251,113,133,0.1)" },
};

export function TimesheetClient({
  entries,
  hourlyRate,
}: {
  entries: Entry[];
  hourlyRate: number;
}) {
  const days = groupByDay(entries);
  const totalHours = entries.reduce((s, e) => s + (e.total_hours ?? 0), 0);
  const overtimeHours = entries.reduce(
    (s, e) => s + (e.overtime_hours ?? 0),
    0
  );
  const totalPay = totalHours * hourlyRate;
  const maxDayHours = Math.max(...days.map((d) => d.totalHours), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <h1
          className="font-heading text-xl font-bold"
          style={{ color: "var(--tt-text-primary)" }}
        >
          My Timesheet
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
          Last 2 weeks
        </p>
      </div>

      {/* Summary */}
      <div
        className="mt-5 rounded-xl p-5"
        style={{
          backgroundColor: "var(--tt-card-bg)",
          border: "1px solid var(--tt-border-subtle)",
          boxShadow: "var(--tt-card-inner-shadow)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--tt-text-muted)" }}
            >
              Total Hours
            </p>
            <p
              className="mt-1 font-mono text-2xl font-bold"
              style={{ color: "var(--tt-text-primary)" }}
            >
              {formatHours(totalHours)}
            </p>
          </div>
          <div className="text-center">
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--tt-text-muted)" }}
            >
              Overtime
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-amber-400">
              {overtimeHours > 0 ? formatHours(overtimeHours) : "0h"}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--tt-text-muted)" }}
            >
              Est. Pay
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
              ${totalPay.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--tt-text-muted)" }}>
            <span>{formatHours(totalHours)} worked</span>
            <span>40h standard</span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--tt-border-subtle)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (totalHours / 40) * 100)}%`,
                background: totalHours > 40
                  ? "linear-gradient(90deg, #818CF8, #FBBF24)"
                  : "linear-gradient(90deg, #6366F1, #818CF8)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Day list */}
      {days.length === 0 ? (
        <div
          className="mt-8 flex flex-col items-center rounded-xl py-16"
          style={{
            backgroundColor: "var(--tt-card-bg)",
            border: "1px solid var(--tt-border-subtle)",
          }}
        >
          <FileText
            size={28}
            strokeWidth={1.5}
            style={{ color: "var(--tt-text-muted)" }}
          />
          <p
            className="mt-4 text-sm font-medium"
            style={{ color: "var(--tt-text-primary)" }}
          >
            No time entries yet
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--tt-text-muted)" }}
          >
            Clock in to start tracking your hours
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {days.map((day) => (
            <DayRow
              key={day.date.toISOString()}
              day={day}
              maxHours={maxDayHours}
              hourlyRate={hourlyRate}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function DayRow({
  day,
  maxHours,
  hourlyRate,
}: {
  day: DayGroup;
  maxHours: number;
  hourlyRate: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = isToday(day.date);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: today
          ? "var(--tt-card-hover-bg)"
          : "var(--tt-card-bg)",
        border: "1px solid var(--tt-border-subtle)",
      }}
    >
      {/* Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 transition-colors sm:gap-4"
      >
        <div className="w-24 shrink-0 text-left sm:w-28">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--tt-text-primary)" }}
          >
            {format(day.date, "EEE, MMM d")}
          </p>
          {today && (
            <span className="text-[10px] font-semibold text-indigo-400">
              Today
            </span>
          )}
        </div>

        {/* Bar */}
        <div className="flex-1">
          <div
            className="h-5 overflow-hidden rounded-md"
            style={{ backgroundColor: "var(--tt-border-faint)" }}
          >
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${Math.max(4, (day.totalHours / maxHours) * 100)}%`,
                background:
                  day.totalHours > 8
                    ? "linear-gradient(90deg, #818CF8, #FBBF24)"
                    : "linear-gradient(90deg, #6366F1, #818CF8)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="w-14 text-right font-mono text-sm font-medium"
            style={{ color: "var(--tt-text-primary)" }}
          >
            {formatHours(day.totalHours)}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--tt-text-muted)" }}
          />
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
              {day.entries.map((entry) => {
                const hours = entry.total_hours ?? 0;
                const breakMin = entry.total_break_minutes ?? 0;
                const st = statusStyle[entry.status] ?? statusStyle.completed;
                return (
                  <div
                    key={entry.id}
                    className="px-4 py-3"
                    style={{
                      borderBottom: "1px solid var(--tt-border-faint)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock
                        size={14}
                        style={{ color: "var(--tt-text-muted)" }}
                      />
                      <div>
                        <p
                          className="text-sm"
                          style={{ color: "var(--tt-text-secondary)" }}
                        >
                          {format(new Date(entry.clock_in), "h:mm a")} →{" "}
                          {entry.clock_out
                            ? format(new Date(entry.clock_out), "h:mm a")
                            : "In progress"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="font-mono text-xs"
                            style={{ color: "var(--tt-text-primary)" }}
                          >
                            {formatHours(hours)}
                          </span>
                          {breakMin > 0 && (
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--tt-text-muted)" }}
                            >
                              ({breakMin}m break)
                            </span>
                          )}
                          {hourlyRate > 0 && (
                            <span className="font-mono text-[11px] text-emerald-400">
                              ${(hours * hourlyRate).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: st.bg,
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                  {entry.status === "flagged" && entry.notes && (
                    <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs text-amber-400">Flagged by admin: {entry.notes}</p>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
