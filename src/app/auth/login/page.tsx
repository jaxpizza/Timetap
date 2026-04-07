"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setErrors({ email: "Enter your email first" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }

    setMagicLinkLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Magic link sent! Check your email.");
    }
    setMagicLinkLoading(false);
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
          Workforce management, simplified.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-card border border-zinc-700/80 bg-card p-8 shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <Switch
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              Remember me
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-button bg-timetap-primary-600 text-sm font-semibold text-white transition-all hover:bg-timetap-primary-500 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Magic Link */}
        <Button
          type="button"
          variant="outline"
          disabled={magicLinkLoading}
          onClick={handleMagicLink}
          className="h-11 w-full rounded-button border-zinc-600 text-sm font-semibold text-zinc-300 hover:bg-zinc-800/50"
        >
          {magicLinkLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Sign in with Magic Link"
          )}
        </Button>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-timetap-primary-400 transition-colors hover:text-timetap-primary-300"
          >
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
