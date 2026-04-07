"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getInitials } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateProfile, changePassword } from "./actions";

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const roleBadge: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(129,140,248,0.1)", text: "#818CF8" },
  admin: { bg: "rgba(167,139,250,0.1)", text: "#A78BFA" },
  manager: { bg: "rgba(251,191,36,0.1)", text: "#FBBF24" },
  employee: { bg: "rgba(52,211,153,0.1)", text: "#34D399" },
};

export function ProfileClient({ profile, balances, departmentName }: { profile: any; balances: any[]; departmentName: string | null }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);

  const badge = roleBadge[profile?.role] ?? roleBadge.employee;

  async function handleSave() {
    setLoading("profile");
    const r = await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
    setLoading(null);
    r.success ? (toast.success("Profile updated"), router.refresh()) : toast.error(r.error || "Failed");
  }

  async function handleChangePw() {
    if (newPw.length < 8) { toast.error("Password must be 8+ characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    setLoading("pw");
    const r = await changePassword(newPw);
    setLoading(null);
    if (r.success) { toast.success("Password changed"); setNewPw(""); setConfirmPw(""); setPwOpen(false); }
    else toast.error(r.error || "Failed");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white"
          style={{ boxShadow: "0 0 12px rgba(99,102,241,0.25)" }}>
          {getInitials(profile?.first_name, profile?.last_name)}
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold" style={{ color: "var(--tt-text-primary)" }}>
            {capitalize(profile?.first_name)} {capitalize(profile?.last_name)}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize" style={{ backgroundColor: badge.bg, color: badge.text }}>{profile?.role}</span>
            {departmentName && <span className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{departmentName}</span>}
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "var(--tt-text-muted)" }}>{profile?.email}</p>
        </div>
      </div>

      {/* Personal Info */}
      <Section title="Personal Info">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Last name"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" /></Field>
        <Field label="Email"><Input value={profile?.email} disabled className="opacity-60" /></Field>
        <Button onClick={handleSave} disabled={loading === "profile"} className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600">
          {loading === "profile" ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
        </Button>
      </Section>

      {/* Employment */}
      <Section title="Employment">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Role" value={capitalize(profile?.role)} />
          <InfoItem label="Department" value={departmentName ?? "—"} />
          <InfoItem label="Hire Date" value={profile?.hire_date ? format(new Date(profile.hire_date + "T12:00:00"), "MMM d, yyyy") : "—"} />
          <InfoItem label="Organization" value={capitalize((profile as any)?.organizations?.name)} />
        </div>
      </Section>

      {/* PTO */}
      {balances.length > 0 && (
        <Section title="PTO Balances">
          {balances.map((b: any) => (
            <div key={b.pto_policy_id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: b.pto_policies?.color ?? "#818CF8" }} />
                <span className="text-sm" style={{ color: "var(--tt-text-primary)" }}>{b.pto_policies?.name}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>{b.balance_hours}h</span>
            </div>
          ))}
        </Section>
      )}

      {/* Account */}
      <Section title="Account">
        {pwOpen ? (
          <div className="space-y-3">
            <Field label="New password"><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 8 characters" /></Field>
            <Field label="Confirm"><Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} /></Field>
            <div className="flex gap-2">
              <Button onClick={handleChangePw} disabled={loading === "pw"} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600">
                {loading === "pw" ? <Loader2 className="size-4 animate-spin" /> : "Update Password"}
              </Button>
              <Button variant="ghost" onClick={() => setPwOpen(false)} className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setPwOpen(true)} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
            <Lock size={14} /> Change Password
          </button>
        )}
        <label className="flex items-center gap-3 pt-2">
          <Switch checked={theme === "light"} onCheckedChange={toggleTheme} />
          <span className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>Light mode</span>
        </label>
        <button onClick={handleSignOut} className="flex items-center gap-2 pt-2 text-sm text-rose-400 hover:text-rose-300">
          <LogOut size={14} /> Sign Out
        </button>
      </Section>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>{title}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>{label}</Label>{children}</div>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{label}</p><p className="text-sm" style={{ color: "var(--tt-text-primary)" }}>{value}</p></div>;
}
