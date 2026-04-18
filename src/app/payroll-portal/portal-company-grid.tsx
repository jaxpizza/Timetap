"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Users, Calendar, ArrowRight, Calculator } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { useSelectedOrg } from "./org-context";
import { AddCompanySheet } from "./add-company-sheet";

interface EnrichedOrg {
  id: string;
  name: string;
  employeeCount: number;
  lastPayrollDate: string | null;
  lastPayrollGross: number;
}

const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PortalCompanyGrid({ orgs }: { orgs: EnrichedOrg[] }) {
  const { setOrg } = useSelectedOrg();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
          <Calculator size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Your Client Companies</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Select a company to manage their payroll</p>
        </div>
      </div>

      {orgs.length === 0 && (
        <div className="mt-6 flex flex-col items-center rounded-xl p-10 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="flex size-14 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <Building2 size={26} className="text-amber-400" />
          </div>
          <p className="mt-4 text-base font-semibold" style={{ color: "var(--tt-text-primary)" }}>No active companies yet</p>
          <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            Ask a company admin for their TimeTap invite code, then add them below to start managing their payroll.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <Plus size={15} /> Add Company
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map((org) => (
          <Link
            key={org.id}
            href={`/payroll-portal?org=${org.id}`}
            onClick={() => setOrg(org.id)}
            className="group rounded-xl p-5 transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(129,140,248,0.1)" }}>
                <Building2 size={18} className="text-indigo-400" />
              </div>
              <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--tt-text-muted)" }} />
            </div>
            <p className="mt-4 text-base font-semibold" style={{ color: "var(--tt-text-primary)" }}>{org.name}</p>

            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--tt-text-muted)" }}>
              <Users size={12} />
              <span>{org.employeeCount} {org.employeeCount === 1 ? "employee" : "employees"}</span>
            </div>

            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--tt-border-faint)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Last Payroll</p>
              {org.lastPayrollDate ? (
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} style={{ color: "var(--tt-text-muted)" }} />
                    <span className="font-mono text-xs" style={{ color: "var(--tt-text-secondary)" }}>
                      {format(parseLocalDate(org.lastPayrollDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-400">{$(org.lastPayrollGross)}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>No payroll processed yet</p>
              )}
            </div>

            <div className="mt-4 rounded-lg bg-amber-500/10 py-2 text-center text-xs font-semibold text-amber-400 transition-colors group-hover:bg-amber-500/20">
              Open
            </div>
          </Link>
        ))}

        {orgs.length > 0 && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-colors hover:bg-[var(--tt-elevated-bg)]"
            style={{ borderColor: "rgba(245,158,11,0.3)", color: "#FBBF24" }}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/15">
              <Plus size={18} />
            </div>
            <p className="text-sm font-semibold">Add Company</p>
            <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Enter an invite code to request access</p>
          </button>
        )}
      </div>

      <AddCompanySheet open={addOpen} onOpenChange={setAddOpen} />
    </motion.div>
  );
}
