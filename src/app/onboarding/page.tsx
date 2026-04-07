"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, UserPlus, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPremium } from "@/components/ui/select-premium";
import { createOrganization, joinOrganization } from "./actions";

type Selection = "create" | "join" | null;

const timezones = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
];

const payPeriods = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "semimonthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
];

export default function OnboardingPage() {
  const [selection, setSelection] = useState<Selection>(null);
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [payPeriod, setPayPeriod] = useState("biweekly");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");

  function formatInviteCode(raw: string) {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 8);
    if (clean.length > 4) return clean.substring(0, 4) + "-" + clean.substring(4);
    return clean;
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = inviteCode.trim();
    if (code.length < 9) {
      setJoinError("Enter a valid invite code");
      return;
    }
    setJoinLoading(true);
    setJoinError("");
    const result = await joinOrganization(code);
    setJoinLoading(false);
    if (!result.success) {
      toast.error(result.error || "Failed to join");
      setJoinError(result.error || "Failed to join");
      return;
    }
    toast.success("Request submitted!");
    window.location.href = "/dashboard/pending";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setLoading(true);
    setError("");

    const result = await createOrganization(
      companyName.trim(),
      timezone,
      payPeriod
    );

    if (!result.success) {
      toast.error(result.error || "Something went wrong");
      setLoading(false);
      return;
    }

    toast.success("Organization created!");
    window.location.href = "/admin";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2">
          <Clock className="size-7 text-timetap-primary-400" />
          <span className="font-heading text-3xl font-extrabold tracking-tight">
            <span className="text-white">Time</span>
            <span className="text-timetap-primary-400">Tap</span>
          </span>
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-white">
          Get started with TimeTap
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          How would you like to begin?
        </p>
      </div>

      {/* Option cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSelection("create")}
          className={`rounded-card border bg-card p-6 text-left transition-all duration-200 cursor-pointer hover:bg-zinc-800/50 hover:scale-[1.02] ${
            selection === "create"
              ? "border-timetap-primary-500 ring-2 ring-timetap-primary-500/20"
              : "border-zinc-700/80 hover:border-timetap-primary-500/50"
          }`}
        >
          <Building2 className="size-8 text-timetap-primary-500" />
          <h3 className="mt-3 font-semibold text-white">
            Create your company
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Set up your organization and start managing your team
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelection("join")}
          className={`rounded-card border bg-card p-6 text-left transition-all duration-200 cursor-pointer hover:bg-zinc-800/50 hover:scale-[1.02] ${
            selection === "join"
              ? "border-timetap-success ring-2 ring-timetap-success/20"
              : "border-zinc-700/80 hover:border-timetap-success/50"
          }`}
        >
          <UserPlus className="size-8 text-timetap-success" />
          <h3 className="mt-3 font-semibold text-white">Join a company</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Enter an invite code from your employer
          </p>
        </button>
      </div>

      {/* Expandable forms */}
      <AnimatePresence mode="wait">
        {selection === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-card border border-zinc-700/80 bg-card p-6 shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-zinc-300">
                    Company name
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (error) setError("");
                    }}
                    aria-invalid={!!error}
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Timezone</Label>
                  <SelectPremium
                    value={timezone}
                    onValueChange={setTimezone}
                    options={timezones}
                    placeholder="Select timezone"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Pay period</Label>
                  <SelectPremium
                    value={payPeriod}
                    onValueChange={setPayPeriod}
                    options={payPeriods}
                    placeholder="Select pay period"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-button bg-timetap-primary-600 text-sm font-semibold text-white transition-all hover:bg-timetap-primary-500 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Create organization"
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {selection === "join" && (
          <motion.div
            key="join"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-card border border-zinc-700/80 bg-card p-6 shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
              <form onSubmit={handleJoin} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-zinc-300">
                    Invite code
                  </Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(formatInviteCode(e.target.value));
                      if (joinError) setJoinError("");
                    }}
                    placeholder="ABCD-1234"
                    className="text-center font-mono text-2xl tracking-[0.3em] uppercase"
                    maxLength={9}
                    aria-invalid={!!joinError}
                  />
                  {joinError && (
                    <p className="text-center text-xs text-destructive">{joinError}</p>
                  )}
                  <p className="text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>
                    Ask your employer for the invite code
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={joinLoading || inviteCode.length < 9}
                  className="h-11 w-full rounded-button bg-timetap-success text-sm font-semibold text-white transition-all hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {joinLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Join"
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
