"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Inbox, Calculator, UserCheck, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import {
  superApprovePayrollProvider,
  superDenyPayrollProvider,
  superApproveEmployee,
  superRejectEmployee,
} from "./actions";

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

interface ProviderRequest {
  id: string;
  providerId: string;
  organizationId: string;
  createdAt: string;
  providerFirstName: string | null;
  providerLastName: string | null;
  providerEmail: string;
  orgName: string;
}

interface EmployeeRequest {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  organizationId: string;
  orgName: string;
  createdAt: string;
}

export function PendingRequestsClient({
  providerRequests,
  employeeRequests,
}: {
  providerRequests: ProviderRequest[];
  employeeRequests: EmployeeRequest[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"providers" | "employees">(
    providerRequests.length > 0 ? "providers" : "employees"
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApproveProvider(r: ProviderRequest) {
    setLoadingId(r.id);
    const res = await superApprovePayrollProvider(r.providerId, r.organizationId);
    setLoadingId(null);
    if (res.success) { toast.success(`Approved for ${r.orgName}`); router.refresh(); }
    else toast.error(res.error || "Failed");
  }

  async function handleDenyProvider(r: ProviderRequest) {
    setLoadingId(r.id);
    const res = await superDenyPayrollProvider(r.providerId, r.organizationId);
    setLoadingId(null);
    if (res.success) { toast.success("Request denied"); router.refresh(); }
    else toast.error(res.error || "Failed");
  }

  async function handleApproveEmployee(e: EmployeeRequest) {
    setLoadingId(e.id);
    const res = await superApproveEmployee(e.id);
    setLoadingId(null);
    if (res.success) { toast.success(`Approved for ${e.orgName || "the org"}`); router.refresh(); }
    else toast.error(res.error || "Failed");
  }

  async function handleRejectEmployee(e: EmployeeRequest) {
    setLoadingId(e.id);
    const res = await superRejectEmployee(e.id);
    setLoadingId(null);
    if (res.success) { toast.success("Request rejected"); router.refresh(); }
    else toast.error(res.error || "Failed");
  }

  const total = providerRequests.length + employeeRequests.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(244,63,94,0.1)" }}>
          <Inbox size={20} className="text-rose-400" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Pending Requests</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            {total} {total === 1 ? "request" : "requests"} waiting for approval across all organizations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        <TabButton
          label="Payroll Providers"
          icon={Calculator}
          count={providerRequests.length}
          active={tab === "providers"}
          onClick={() => setTab("providers")}
        />
        <TabButton
          label="Employees"
          icon={UserCheck}
          count={employeeRequests.length}
          active={tab === "employees"}
          onClick={() => setTab("employees")}
        />
      </div>

      {/* Content */}
      {tab === "providers" && (
        <div className="mt-4 space-y-3">
          {providerRequests.length === 0 ? (
            <EmptyState icon={Calculator} title="No pending provider requests" subtitle="External payroll providers will show up here when they request access." />
          ) : (
            providerRequests.map((r) => {
              const name = `${capitalize(r.providerFirstName)} ${capitalize(r.providerLastName)}`.trim() || "Payroll Provider";
              return (
                <div key={r.id}
                  className="flex items-center justify-between rounded-xl p-4"
                  style={{ backgroundColor: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-bold text-white">
                      {getInitials(r.providerFirstName ?? undefined, r.providerLastName ?? undefined)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{name}</p>
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Payroll Provider</span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{r.providerEmail}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--tt-text-faint)" }}>
                        <Building2 size={10} />
                        Wants to manage <span style={{ color: "var(--tt-text-tertiary)" }}>{r.orgName}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveProvider(r)}
                      disabled={loadingId === r.id}
                      className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {loadingId === r.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDenyProvider(r)}
                      disabled={loadingId === r.id}
                      className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {loadingId === r.id ? "..." : "Deny"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "employees" && (
        <div className="mt-4 space-y-3">
          {employeeRequests.length === 0 ? (
            <EmptyState icon={UserCheck} title="No pending employee requests" subtitle="Employees awaiting approval from their org admins will show up here." />
          ) : (
            employeeRequests.map((e) => {
              const name = `${capitalize(e.firstName)} ${capitalize(e.lastName)}`.trim() || "Employee";
              return (
                <div key={e.id}
                  className="flex items-center justify-between rounded-xl p-4"
                  style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                      {getInitials(e.firstName ?? undefined, e.lastName ?? undefined)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{name}</p>
                      <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{e.email}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--tt-text-faint)" }}>
                        <Building2 size={10} />
                        Requesting access to <span style={{ color: "var(--tt-text-tertiary)" }}>{e.orgName || "—"}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveEmployee(e)}
                      disabled={loadingId === e.id}
                      className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {loadingId === e.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleRejectEmployee(e)}
                      disabled={loadingId === e.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {loadingId === e.id ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}

function TabButton({ label, icon: Icon, count, active, onClick }: { label: string; icon: any; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${active ? "shadow-sm" : ""}`}
      style={{
        backgroundColor: active ? "var(--tt-card-bg)" : "transparent",
        color: active ? "var(--tt-text-primary)" : "var(--tt-text-muted)",
      }}
    >
      <Icon size={14} />
      {label}
      {count > 0 && (
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-rose-500/20 text-[11px] font-bold text-rose-400">
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl py-12" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <Icon size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
      <p className="mt-3 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{title}</p>
      <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>{subtitle}</p>
    </div>
  );
}
