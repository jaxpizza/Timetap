"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Coffee, Square } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { formatHours } from "@/lib/utils";
import { clockIn, clockOut, startBreak, endBreak } from "./actions";

/* ── types ── */

interface ActiveEntry {
  id: string;
  clock_in: string;
  total_break_minutes: number;
}

interface ActiveBreakData {
  id: string;
  start_time: string;
}

interface Props {
  greeting: string;
  firstName: string;
  activeEntry: ActiveEntry | null;
  activeBreak: ActiveBreakData | null;
  payRate: number | null;
  payType: string;
  lastShift: { date: string; hours: number } | null;
  weekHours: number;
}

/* ── helpers ── */

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function useElapsed(startIso: string | null) {
  const [elapsed, setElapsed] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!startIso) {
      setElapsed(0);
      return;
    }
    const start = new Date(startIso).getTime();
    function tick() {
      setElapsed(Math.max(0, (Date.now() - start) / 1000));
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [startIso]);

  return elapsed;
}

function fmtTimer(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return {
    hh: String(h).padStart(2, "0"),
    mm: String(m).padStart(2, "0"),
    ss: String(s).padStart(2, "0"),
  };
}

/* ── main ── */

export function ClockClient({
  greeting,
  firstName,
  activeEntry: initialEntry,
  activeBreak: initialBreak,
  payRate,
  payType,
  lastShift,
  weekHours,
}: Props) {
  const [entry, setEntry] = useState(initialEntry);
  const [onBreak, setOnBreak] = useState(initialBreak);
  const [loading, setLoading] = useState(false);
  const [justClocked, setJustClocked] = useState<"in" | "out" | null>(null);

  const elapsed = useElapsed(entry?.clock_in ?? null);
  const breakElapsed = useElapsed(onBreak?.start_time ?? null);

  const netSeconds = Math.max(
    0,
    elapsed - (entry?.total_break_minutes ?? 0) * 60 - (onBreak ? breakElapsed : 0)
  );
  const timer = fmtTimer(netSeconds);
  const hourlyRate = payType === "salary" && payRate ? payRate / 2080 : payRate;
  const earnings = hourlyRate ? (netSeconds / 3600) * hourlyRate : 0;

  const displayName = capitalize(firstName) || "there";

  /* ── actions ── */

  function getGeo(): Promise<{ latitude: number | null; longitude: number | null; accuracy: number | null }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ latitude: null, longitude: null, accuracy: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve({ latitude: null, longitude: null, accuracy: null }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function handleClockIn() {
    setLoading(true);
    const geo = await getGeo();
    const res = await clockIn(geo);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Failed to clock in");
      return;
    }
    setEntry({
      id: res.timeEntryId!,
      clock_in: new Date().toISOString(),
      total_break_minutes: 0,
    });
    setJustClocked("in");
    if (res.onSite === false) toast("You're clocking in off-site", { icon: "📍" });
    else toast.success("Clocked in!");
    setTimeout(() => setJustClocked(null), 1500);
  }

  async function handleClockOut() {
    if (!entry) return;
    setLoading(true);
    const geo = await getGeo();
    const res = await clockOut(entry.id, geo);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Failed to clock out");
      return;
    }
    setJustClocked("out");
    toast.success(`Shift complete — ${formatHours(res.totalHours ?? netSeconds / 3600)}`);
    setTimeout(() => {
      setEntry(null);
      setOnBreak(null);
      setJustClocked(null);
    }, 2000);
  }

  async function handleBreakToggle() {
    if (!entry) return;
    if (onBreak) {
      const res = await endBreak(onBreak.id);
      if (!res.success) {
        toast.error("Failed to end break");
        return;
      }
      setEntry((prev) =>
        prev
          ? {
              ...prev,
              total_break_minutes:
                prev.total_break_minutes + Math.round(breakElapsed / 60),
            }
          : prev
      );
      setOnBreak(null);
      toast.success("Break ended");
    } else {
      const res = await startBreak(entry.id);
      if (!res.success) {
        toast.error("Failed to start break");
        return;
      }
      setOnBreak({ id: res.breakId!, start_time: new Date().toISOString() });
      toast.success("Break started");
    }
  }

  const isClockedIn = !!entry;
  const today = format(new Date(), "EEEE, MMMM d");

  /* ── render ── */

  return (
    <div className="flex flex-col items-center pt-4 md:pt-8">
      <AnimatePresence mode="wait">
        {!isClockedIn ? (
          /* ═══ NOT CLOCKED IN ═══ */
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex w-full max-w-sm flex-col items-center text-center"
          >
            <h1
              className="font-heading text-2xl font-bold"
              style={{ color: "var(--tt-text-primary)" }}
            >
              {greeting}, {displayName}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              {today}
            </p>

            {/* Clock In Button */}
            <div className="relative mt-10 mb-8">
              {/* Pulse ring */}
              <span className="absolute inset-0 animate-[clock-pulse_2.5s_ease-in-out_infinite] rounded-full border-2 border-emerald-400/40" />
              <motion.button
                onClick={handleClockIn}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex size-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white md:size-48"
                style={{
                  boxShadow:
                    "0 0 40px rgba(20,184,166,0.3), 0 0 80px rgba(20,184,166,0.15)",
                }}
              >
                <AnimatePresence mode="wait">
                  {justClocked === "in" ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check size={36} strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <Clock size={28} strokeWidth={1.8} />
                      <span className="font-heading text-xl font-bold">
                        Clock In
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <p
              className="text-sm"
              style={{ color: "var(--tt-text-muted)" }}
            >
              Tap to start your shift
            </p>

            {/* Info cards */}
            <div className="mt-6 flex w-full flex-col gap-2">
              {lastShift && (
                <InfoRow
                  label="Last shift"
                  value={`${formatDistanceToNow(new Date(lastShift.date), { addSuffix: true })}, ${formatHours(lastShift.hours)}`}
                />
              )}
              <InfoRow
                label="This week"
                value={formatHours(weekHours)}
              />
            </div>
          </motion.div>
        ) : (
          /* ═══ CLOCKED IN ═══ */
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex w-full max-w-sm flex-col items-center text-center"
          >
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--tt-text-secondary)" }}
              >
                {onBreak ? "On Break" : "Shift in progress"}
              </p>
            </div>

            {/* Timer */}
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {justClocked === "out" ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20"
                      style={{
                        boxShadow: "0 0 30px rgba(52,211,153,0.2)",
                      }}
                    >
                      <Check
                        size={32}
                        strokeWidth={2.5}
                        className="text-emerald-400"
                      />
                    </div>
                    <p
                      className="font-heading text-xl font-bold"
                      style={{ color: "var(--tt-text-primary)" }}
                    >
                      Shift Complete
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="timer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono font-bold"
                    style={{ color: "var(--tt-text-primary)" }}
                  >
                    <span className="text-5xl md:text-6xl">
                      {timer.hh}:{timer.mm}
                    </span>
                    <span
                      className="text-4xl md:text-5xl"
                      style={{ color: "var(--tt-text-tertiary)" }}
                    >
                      :{timer.ss}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Earnings */}
            {hourlyRate && justClocked !== "out" && (
              <div className="mt-4">
                <p
                  className="text-xs"
                  style={{ color: "var(--tt-text-muted)" }}
                >
                  Earning
                </p>
                <p className="mt-0.5 font-mono text-2xl font-bold text-emerald-400">
                  ${earnings.toFixed(2)}
                </p>
              </div>
            )}

            {/* Break info */}
            {onBreak && (
              <p
                className="mt-3 font-mono text-sm"
                style={{ color: "var(--tt-text-tertiary)" }}
              >
                Break: {fmtTimer(breakElapsed).mm}:{fmtTimer(breakElapsed).ss}
              </p>
            )}

            {/* Action buttons */}
            {justClocked !== "out" && (
              <div className="mt-8 flex w-full flex-col items-center gap-3">
                {/* Break */}
                <motion.button
                  onClick={handleBreakToggle}
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={
                    onBreak
                      ? {
                          backgroundColor: "#F59E0B",
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.3)",
                          color: "#FBBF24",
                        }
                  }
                >
                  <Coffee size={16} />
                  {onBreak ? "End Break" : "Take Break"}
                </motion.button>

                {/* Clock Out */}
                <motion.button
                  onClick={handleClockOut}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full max-w-xs rounded-xl bg-gradient-to-r from-rose-500 to-red-600 py-4 text-base font-semibold text-white transition-shadow"
                  style={{
                    boxShadow: "0 0 20px rgba(239,68,68,0.2)",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Square size={16} fill="currentColor" />
                    Clock Out
                  </span>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes clock-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── small info row ── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3"
      style={{
        backgroundColor: "var(--tt-card-bg)",
        border: "1px solid var(--tt-border-subtle)",
      }}
    >
      <span
        className="text-sm"
        style={{ color: "var(--tt-text-muted)" }}
      >
        {label}
      </span>
      <span
        className="font-mono text-sm font-medium"
        style={{ color: "var(--tt-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
