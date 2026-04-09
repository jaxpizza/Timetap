"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` }
    );

    if (resetError) {
      toast.error(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-card border border-zinc-700/80 bg-card p-8 text-center shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
          <Mail className="mx-auto size-12 text-timetap-primary-400" />
          <h2 className="mt-4 font-heading text-xl font-bold text-white">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            If an account with that email exists, we sent a password reset link.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm font-medium text-timetap-primary-400 transition-colors hover:text-timetap-primary-300"
          >
            Back to sign in
          </Link>
        </div>
      </motion.div>
    );
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
        <p className="mt-2 text-sm text-zinc-400">
          Reset your password
        </p>
      </div>

      {/* Card */}
      <div className="rounded-card border border-zinc-700/80 bg-card p-8 shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
              aria-invalid={!!error}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-button bg-timetap-primary-600 text-sm font-semibold text-white transition-all hover:bg-timetap-primary-500 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link
            href="/auth/login"
            className="font-medium text-timetap-primary-400 transition-colors hover:text-timetap-primary-300"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
