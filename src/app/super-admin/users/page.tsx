"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getInitials } from "@/lib/utils";
import { getAllUsers, superDeleteUser, superUpdateProfile } from "../actions";

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const roleBadge: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
  admin: { bg: "rgba(129,140,248,0.15)", text: "#818CF8" },
  manager: { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
  employee: { bg: "rgba(113,113,122,0.15)", text: "#A1A1AA" },
};

export default function AllUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    getAllUsers().then((d) => { setUsers(d); setLoading(false); });
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (u.first_name ?? "").toLowerCase().includes(q) || (u.last_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.organizations?.name ?? "").toLowerCase().includes(q);
  });

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeleting(userId);
    const r = await superDeleteUser(userId);
    setDeleting(null);
    if (r.success) { toast.success("User deleted"); setUsers((prev) => prev.filter((u) => u.id !== userId)); }
    else toast.error(r.error || "Failed");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>All Users</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>{users.length} users across all organizations</p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 rounded-lg px-3" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border)" }}>
        <Search size={14} style={{ color: "var(--tt-text-muted)" }} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or org..."
          className="w-full bg-transparent py-2.5 text-sm outline-none" style={{ color: "var(--tt-text-primary)" }} />
      </div>

      {/* List */}
      <div className="mt-4 space-y-1">
        {loading && <p className="py-8 text-center text-sm" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>}
        {filtered.map((u) => {
          const badge = roleBadge[u.role] ?? roleBadge.employee;
          return (
            <div key={u.id} className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-faint)" }}>
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                  {getInitials(u.first_name, u.last_name)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{capitalize(u.first_name)} {capitalize(u.last_name)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{u.email}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize" style={{ backgroundColor: badge.bg, color: badge.text }}>{u.role}</span>
                    <span className="text-[10px]" style={{ color: "var(--tt-text-faint)" }}>{u.organizations?.name ?? "No org"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={u.role} onChange={async (e) => {
                  const newRole = e.target.value;
                  setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: newRole } : x));
                  const r = await superUpdateProfile(u.id, { role: newRole });
                  r.success ? toast.success(`Updated ${capitalize(u.first_name)}'s role to ${newRole}`) : toast.error(r.error || "Failed");
                }}
                  className="rounded-md border px-1.5 py-0.5 text-[10px] capitalize"
                  style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border-faint)", color: "var(--tt-text-tertiary)" }}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: u.is_active ? "#34D399" : "var(--tt-text-faint)" }} />
                <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id}
                  className="flex size-6 items-center justify-center rounded text-rose-400 hover:bg-rose-500/10">
                  {deleting === u.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
