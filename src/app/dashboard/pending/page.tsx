"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Timer, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PendingPage() {
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // Fetch org name
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.organization_id) {
            supabase
              .from("organizations")
              .select("name")
              .eq("id", profile.organization_id)
              .single()
              .then(({ data: org }) => {
                if (org) setOrgName(org.name);
              });
          }
        });
    });

    // Poll every 5 seconds for approval
    const interval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("join_status")
        .eq("id", user.id)
        .single();
      if (data?.join_status === "active") {
        window.location.href = "/dashboard";
      } else if (data?.join_status === "rejected") {
        window.location.href = "/onboarding?rejected=true";
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ backgroundColor: "var(--tt-page-bg)" }}
    >
      {/* Subtle gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, var(--tt-glow-indigo) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
      >
        {/* Logo */}
        <div className="inline-flex items-center gap-2">
          <Clock size={24} strokeWidth={1.8} className="text-indigo-400" />
          <span className="font-heading text-2xl font-extrabold tracking-tight">
            <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
            <span className="text-indigo-400">Tap</span>
          </span>
        </div>

        {/* Animated hourglass */}
        <motion.div
          className="mt-10"
          animate={{ rotate: [0, 0, 180, 180, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.1, 0.5, 0.6, 1] }}
        >
          <div
            className="flex size-20 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: "rgba(129,140,248,0.1)",
              boxShadow: "0 0 30px rgba(129,140,248,0.1)",
            }}
          >
            <Timer size={36} strokeWidth={1.5} className="text-indigo-400" />
          </div>
        </motion.div>

        <h1
          className="mt-6 font-heading text-2xl font-bold"
          style={{ color: "var(--tt-text-primary)" }}
        >
          Waiting for approval
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: "var(--tt-text-tertiary)" }}
        >
          Your request to join{" "}
          {orgName ? (
            <span style={{ color: "var(--tt-text-primary)" }}>
              {orgName}
            </span>
          ) : (
            "the organization"
          )}{" "}
          has been submitted. Your administrator will review it shortly.
        </p>

        {/* Pulsing indicator */}
        <div className="mt-6 flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-indigo-400" />
          </span>
          <p
            className="text-sm"
            style={{ color: "var(--tt-text-muted)" }}
          >
            You&apos;ll be redirected automatically once approved
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-10 flex items-center gap-2 text-sm text-rose-400 transition-colors hover:text-rose-300"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
