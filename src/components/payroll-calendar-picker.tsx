"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  isWithinInterval,
  addDays,
  parseISO,
} from "date-fns";
import { parseLocalDate, toLocalDateString } from "@/lib/utils";

interface Period {
  startDate: string;
  endDate: string;
  status: string;
}

interface Props {
  existingPeriods: Period[];
  onSelect: (startDate: string, endDate: string) => void;
  payPeriodType?: string;
}

function getDayStatus(
  day: Date,
  periods: Period[]
): { type: "completed" | "open" | "locked" | null; period: Period | null } {
  const ds = toLocalDateString(day);
  for (const p of periods) {
    const start = parseLocalDate(p.startDate);
    const end = parseLocalDate(p.endDate);
    if (
      (isSameDay(day, start) || isAfter(day, start)) &&
      (isSameDay(day, end) || isBefore(day, end))
    ) {
      return {
        type: p.status === "completed" ? "completed" : p.status === "locked" ? "locked" : "open",
        period: p,
      };
    }
  }
  return { type: null, period: null };
}

function suggestEndDate(start: Date, type?: string): Date {
  switch (type) {
    case "weekly":
      return addDays(start, 6);
    case "biweekly":
      return addDays(start, 13);
    case "semimonthly": {
      const d = start.getDate();
      if (d <= 15) return new Date(start.getFullYear(), start.getMonth(), 15);
      return endOfMonth(start);
    }
    case "monthly":
      return endOfMonth(start);
    default:
      return addDays(start, 13);
  }
}

export function PayrollCalendarPicker({ existingPeriods, onSelect, payPeriodType }: Props) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [direction, setDirection] = useState(0);

  const calDays = useMemo(() => {
    const ms = startOfMonth(viewMonth);
    const me = endOfMonth(viewMonth);
    const cs = startOfWeek(ms, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: cs, end: addDays(me, 6 - me.getDay()) });
    return days.slice(0, 42);
  }, [viewMonth]);

  function navMonth(offset: number) {
    setDirection(offset);
    setViewMonth((m) => addMonths(m, offset));
  }

  function handleDayClick(day: Date) {
    if (!startDate || (startDate && endDate)) {
      // First click or reset
      setStartDate(day);
      const suggested = suggestEndDate(day, payPeriodType);
      setEndDate(suggested);
      onSelect(toLocalDateString(day), toLocalDateString(suggested));
    } else {
      // Second click — set end date
      if (isBefore(day, startDate)) {
        setStartDate(day);
        onSelect(toLocalDateString(day), toLocalDateString(startDate));
        setEndDate(startDate);
      } else {
        setEndDate(day);
        onSelect(toLocalDateString(startDate), toLocalDateString(day));
      }
    }
  }

  function isInSelection(day: Date): boolean {
    if (!startDate || !endDate) return false;
    const s = isBefore(startDate, endDate) ? startDate : endDate;
    const e = isAfter(startDate, endDate) ? startDate : endDate;
    return isWithinInterval(day, { start: s, end: e });
  }

  function isSelectionStart(day: Date): boolean {
    return !!startDate && isSameDay(day, startDate);
  }

  function isSelectionEnd(day: Date): boolean {
    return !!endDate && isSameDay(day, endDate);
  }

  // Check overlap
  const overlapWarning = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = isBefore(startDate, endDate) ? startDate : endDate;
    const e = isAfter(startDate, endDate) ? startDate : endDate;
    for (const p of existingPeriods) {
      const ps = parseLocalDate(p.startDate);
      const pe = parseLocalDate(p.endDate);
      if (isBefore(s, pe) && isAfter(e, ps)) {
        return `This overlaps with a previous payroll period (${format(ps, "MMM d")} — ${format(pe, "MMM d")})`;
      }
    }
    return null;
  }, [startDate, endDate, existingPeriods]);

  const selectionDays = startDate && endDate ? Math.abs(Math.round((endDate.getTime() - startDate.getTime()) / 86400000)) + 1 : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        {/* Month nav */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navMonth(-1)} className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--tt-elevated-bg)]" style={{ color: "var(--tt-text-tertiary)" }}>
            <ChevronLeft size={18} />
          </button>
          <p className="font-heading text-sm font-bold" style={{ color: "var(--tt-text-primary)" }}>
            {format(viewMonth, "MMMM yyyy")}
          </p>
          <button onClick={() => navMonth(1)} className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--tt-elevated-bg)]" style={{ color: "var(--tt-text-tertiary)" }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-semibold" style={{ color: "var(--tt-text-muted)" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={format(viewMonth, "yyyy-MM")}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7"
          >
            {calDays.map((day, i) => {
              const inMonth = isSameMonth(day, viewMonth);
              const today = isToday(day);
              const { type: periodType } = getDayStatus(day, existingPeriods);
              const inSel = isInSelection(day);
              const isStart = isSelectionStart(day);
              const isEnd = isSelectionEnd(day);
              const isEndpoint = isStart || isEnd;

              // Determine background
              let bg = "transparent";
              let textColor = "var(--tt-text-primary)";
              let fontWeight = "normal";
              let borderStyle = "";

              if (!inMonth) {
                textColor = "var(--tt-text-faint)";
              }

              // Existing period band
              if (periodType === "completed") {
                bg = "rgba(52,211,153,0.12)";
                textColor = "#34D399";
              } else if (periodType === "open" || periodType === "locked") {
                bg = "rgba(251,191,36,0.12)";
                textColor = "#FBBF24";
              }

              // Selection band (overrides period coloring)
              if (inSel && !isEndpoint) {
                bg = "rgba(99,102,241,0.12)";
                textColor = "var(--tt-text-primary)";
              }

              // Selection endpoints
              if (isEndpoint) {
                bg = "#6366F1";
                textColor = "#ffffff";
                fontWeight = "700";
              }

              if (today && !isEndpoint) {
                borderStyle = "2px solid #6366F1";
                fontWeight = "700";
              }

              return (
                <button
                  key={i}
                  onClick={() => inMonth && handleDayClick(day)}
                  disabled={!inMonth}
                  className="flex h-8 items-center justify-center text-xs transition-colors sm:h-10 sm:text-sm"
                  style={{
                    backgroundColor: bg,
                    color: textColor,
                    fontWeight,
                    border: borderStyle || "none",
                    borderRadius: isStart ? "9999px 0 0 9999px" : isEnd ? "0 9999px 9999px 0" : isEndpoint ? "9999px" : inSel ? "0" : "9999px",
                    opacity: inMonth ? 1 : 0.3,
                  }}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px]" style={{ color: "var(--tt-text-muted)" }}>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500" /> Selected period</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Completed payroll</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" /> Open / Processing</span>
        </div>
      </div>

      {/* Selection summary */}
      {startDate && endDate && (
        <div className="rounded-lg px-4 py-3" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
          <p className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>
            Selected: {format(startDate, "MMM d")} — {format(endDate, "MMM d, yyyy")}
            <span className="ml-2 text-xs" style={{ color: "var(--tt-text-muted)" }}>({selectionDays} days)</span>
          </p>
          {overlapWarning && (
            <p className="mt-1 text-xs text-amber-400">⚠ {overlapWarning}</p>
          )}
        </div>
      )}
    </div>
  );
}
