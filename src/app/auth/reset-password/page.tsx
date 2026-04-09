"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "verifying" | "ready" | "error";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("verifying");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const resolved = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    function markReady() {
      if (!resolved.current) {
        resolved.current = true;
        setStatus("ready");
      }
    }

    // 1. Listen for auth state changes (handles hash-based tokens)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        markReady();
      }
    });

    // 2. Actively try to establish session
    async function tryEstablishSession() {
      // Check for PKCE code in query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          markReady();
          return;
        }
      }

      // Check if session already exists (hash was auto-processed)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        markReady();
        return;
      }

      // Hash fragments may need a moment to be processed
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // Wait for Supabase to process the hash
        await new Promise((r) => setTimeout(r, 1500));
        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();
        if (retrySession) {
          markReady();
          return;
        }
      }

      // Token param format (some Supabase versions)
      const token = params.get("token");
      const type = params.get("type");
      if (token && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as "invite" | "recovery" | "email",
        });
        if (!error) {
          markReady();
          return;
        }
      }

      // Fallback timeout — if nothing works after 6 seconds, show error
      setTimeout(() => {
        if (!resolved.current) {
          resolved.current = true;
          setStatus("error");
        }
      }, 6000);
    }

    tryEstablishSession();

    return () => subscription.unsubscribe();
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Must be at least 8 characters";
    if (password !== confirmPassword) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Password updated! Sign in with your new password.");
    await supabase.auth.signOut();
    window.location.href = "/auth/login?reset=true";
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
            <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
            <span className="text-timetap-primary-400">Tap</span>
          </span>
        </div>
        {status !== "error" && (
          <>
            <h1
              className="mt-4 font-heading text-xl font-bold"
              style={{ color: "var(--tt-text-primary)" }}
            >
              Set your password
            </h1>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              Create a password for your TimeTap account
            </p>
          </>
        )}
      </div>

      {/* Card */}
      <div
        className="rounded-card p-8 shadow-xl shadow-black/20 ring-1 ring-white/[0.03]"
        style={{
          backgroundColor: "var(--tt-card-bg)",
          border: "1px solid var(--tt-border)",
        }}
      >
        {status === "verifying" && (
          <div className="flex flex-col items-center py-8">
            <Loader2
              className="size-8 animate-spin"
              style={{ color: "var(--tt-text-muted)" }}
            />
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--tt-text-muted)" }}
            >
              Verifying your link...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div
              className="flex size-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
            >
              <AlertCircle size={24} className="text-rose-400" />
            </div>
            <h2
              className="mt-4 font-heading text-lg font-bold"
              style={{ color: "var(--tt-text-primary)" }}
            >
              Unable to verify your link
            </h2>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              The link may have expired or already been used. Please ask your
              administrator to resend the invite.
            </p>
            <Link
              href="/auth/login"
              className="mt-5 text-sm font-medium text-timetap-primary-400 transition-colors hover:text-timetap-primary-300"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                style={{ color: "var(--tt-text-secondary)" }}
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((p) => ({ ...p, password: "" }));
                }}
                aria-invalid={!!errors.password}
              />
              {errors.password ? (
                <p className="text-xs text-rose-500">{errors.password}</p>
              ) : (
                <p
                  className="text-xs"
                  style={{ color: "var(--tt-text-muted)" }}
                >
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirm"
                style={{ color: "var(--tt-text-secondary)" }}
              >
                Confirm password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirm)
                    setErrors((p) => ({ ...p, confirm: "" }));
                }}
                aria-invalid={!!errors.confirm}
              />
              {errors.confirm && (
                <p className="text-xs text-rose-500">{errors.confirm}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-button bg-timetap-primary-600 text-sm font-semibold text-white transition-all hover:bg-timetap-primary-500 hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Set Password"
              )}
            </Button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
