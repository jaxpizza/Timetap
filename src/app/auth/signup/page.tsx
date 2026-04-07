"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    if (password !== confirmPassword)
      e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearError(field: string) {
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, user is immediately confirmed
    if (data.session) {
      window.location.href = "/";
      return;
    }

    // Otherwise show confirmation message
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-card border border-zinc-700/80 bg-card p-8 text-center shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
          <CheckCircle2 className="mx-auto size-12 text-timetap-success" />
          <h2 className="mt-4 font-heading text-xl font-bold text-white">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            <br />
            Click it to activate your account.
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
          Create your account to get started.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-card border border-zinc-700/80 bg-card p-8 shadow-xl shadow-black/20 ring-1 ring-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-zinc-300">First name</Label>
              <Input
                id="firstName"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError("firstName");
                }}
                className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-zinc-300">Last name</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError("lastName");
                }}
                className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

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
                clearError("email");
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
                clearError("password");
              }}
              className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
              aria-invalid={!!errors.password}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password}</p>
            ) : (
              <p className="text-xs text-zinc-500">
                Must be at least 8 characters
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError("confirmPassword");
              }}
              className="h-11 rounded-button bg-dark-elevated placeholder:text-zinc-500"
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword}
              </p>
            )}
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
              "Create account"
            )}
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-timetap-primary-400 transition-colors hover:text-timetap-primary-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
