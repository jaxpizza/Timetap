"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  DollarSign,
  Palmtree,
  MapPin,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/* ── rotating words ── */

const rotatingWords = [
  { text: "works.", color: "#34D399" },
  { text: "pays.", color: "#818CF8" },
  { text: "scales.", color: "#FBBF24" },
  { text: "delights.", color: "#FB7185" },
];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % rotatingWords.length), 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-block h-[1.15em] w-[4.5ch] overflow-hidden align-bottom sm:w-[5.5ch]">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute left-0 font-extrabold"
          style={{ color: rotatingWords[index].color }}
        >
          {rotatingWords[index].text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ── scroll-triggered section ── */

function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── feature data ── */

const features = [
  { icon: Clock, title: "Smart Time Clock", desc: "Clock in with a tap. Live earnings counter. Break tracking. Geolocation verification.", color: "#34D399", bg: "rgba(52,211,153,0.08)" },
  { icon: Calendar, title: "Intelligent Scheduling", desc: "Weekly & monthly views. Recurring shifts. Automatic PTO conflict detection.", color: "#818CF8", bg: "rgba(129,140,248,0.08)" },
  { icon: DollarSign, title: "Effortless Payroll", desc: "One-click payroll calculation. Federal & state taxes. Overtime automation.", color: "#FBBF24", bg: "rgba(251,191,36,0.08)" },
  { icon: Palmtree, title: "PTO Management", desc: "Custom policies. Request & approve in seconds. Calendar integration.", color: "#14B8A6", bg: "rgba(20,184,166,0.08)" },
  { icon: MapPin, title: "Location Tracking", desc: "Geofenced clock-ins. Off-site detection. Interactive map history.", color: "#FB7185", bg: "rgba(251,113,133,0.08)" },
  { icon: Sparkles, title: "AI Insights", desc: "Workforce analytics. Overtime alerts. Smart recommendations.", color: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
];

/* ── main page ── */

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "var(--tt-page-bg)", color: "var(--tt-text-primary)" }}>
      {/* ═══ NAV ═══ */}
      <nav
        className="fixed top-0 z-50 w-full transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "var(--tt-nav-blur-bg, rgba(9,9,11,0.85))" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(39,39,42,0.3)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Clock size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Time<span className="text-indigo-400">Tap</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-[var(--tt-text-tertiary)] transition-colors hover:text-white">Features</a>
            <a href="#preview" className="text-sm text-[var(--tt-text-tertiary)] transition-colors hover:text-white">Preview</a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--tt-text-tertiary)] transition-colors hover:text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <Link href="/auth/login" className="text-sm text-[var(--tt-text-tertiary)] transition-colors hover:text-white">Sign In</Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-lg border transition-colors"
              style={{ borderColor: "var(--tt-border)", color: "var(--tt-text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex size-9 items-center justify-center rounded-lg border transition-colors" style={{ borderColor: "var(--tt-border)", color: "var(--tt-text-secondary)" }}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-[var(--tt-border-subtle)] md:hidden"
              style={{ backgroundColor: "var(--tt-sidebar-bg)", backdropFilter: "blur(20px)" }}
            >
              <div className="flex flex-col gap-1 px-5 py-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-[var(--tt-text-secondary)] transition-colors hover:bg-[var(--tt-elevated-bg)]">Features</a>
                <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-[var(--tt-text-secondary)] transition-colors hover:bg-[var(--tt-elevated-bg)]">Preview</a>
                <div className="my-2 h-px bg-[var(--tt-border-subtle)]" />
                <Link href="/auth/login" className="rounded-lg px-3 py-2.5 text-sm text-[var(--tt-text-secondary)] transition-colors hover:bg-[var(--tt-elevated-bg)]">Sign In</Link>
                <Link href="/auth/signup" className="mt-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2.5 text-center text-sm font-semibold text-white">Get Started Free</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-5 pt-16 text-center">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Radial glow */}
          <div
            className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2"
            style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)" }}
          />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "80px 80px" }}
          />
          {/* Aurora */}
          <div className="absolute left-0 right-0 top-0 h-64 animate-pulse opacity-30"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 25%, rgba(20,184,166,0.04) 50%, rgba(99,102,241,0.08) 100%)", filter: "blur(60px)" }}
          />
        </div>

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-400"
          >
            <Sparkles size={12} />
            Workforce Management Reimagined
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-7xl"
        >
          Time tracking that{" "}
          <RotatingWord />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 mt-6 max-w-2xl text-base leading-relaxed text-[var(--tt-text-tertiary)] sm:text-lg md:text-xl"
        >
          The all-in-one platform for time tracking, scheduling, payroll, and team management. Built for businesses that refuse to settle.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/auth/signup"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-4 text-base font-semibold text-white transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(99,102,241,0.4)]"
            style={{ boxShadow: "0 0 30px rgba(99,102,241,0.25)" }}
          >
            Start Free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--tt-border)]"
          >
            <ChevronRight size={16} className="rotate-90 text-[var(--tt-text-muted)]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeInSection className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Everything your team needs</h2>
            <p className="mt-4 text-lg text-[var(--tt-text-tertiary)]">One platform to replace them all</p>
          </FadeInSection>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 0.08}>
                <div
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:border-indigo-500/20"
                  style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid rgba(39,39,42,0.4)" }}
                >
                  {/* Colored top accent line */}
                  <div className="absolute left-0 right-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }} />
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: f.bg }}>
                    <f.icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--tt-text-tertiary)]">{f.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ APP PREVIEW ═══ */}
      <section id="preview" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeInSection className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">See it in action</h2>
            <p className="mt-4 text-lg text-[var(--tt-text-tertiary)]">A command center for your entire workforce</p>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div
              className="mt-16 overflow-hidden rounded-xl border border-[var(--tt-border)]"
              style={{ perspective: "1200px", boxShadow: "0 40px 80px rgba(99,102,241,0.1), 0 0 0 1px rgba(99,102,241,0.05)" }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-[var(--tt-border)] bg-[#0F0F12] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-[var(--tt-text-faint)]" />
                  <span className="size-3 rounded-full bg-[var(--tt-text-faint)]" />
                  <span className="size-3 rounded-full bg-[var(--tt-text-faint)]" />
                </div>
                <div className="mx-auto flex h-7 w-72 items-center justify-center rounded-md bg-[var(--tt-elevated-bg)] text-xs text-[var(--tt-text-muted)]">
                  timetap.live/admin
                </div>
              </div>

              {/* Mock dashboard */}
              <div className="bg-[var(--tt-page-bg)] p-4 sm:p-6">
                <div className="flex gap-4">
                  {/* Mock sidebar */}
                  <div className="hidden w-48 shrink-0 space-y-1 rounded-xl border border-[var(--tt-border-subtle)] bg-[var(--tt-sidebar-bg)] p-3 lg:block">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <div className="size-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600" />
                      <span className="text-xs font-bold text-[var(--tt-text-secondary)]">TimeTap</span>
                    </div>
                    <div className="mt-3 space-y-0.5">
                      {["Dashboard", "Employees", "Time Clock", "Timesheets", "Payroll", "Schedule", "PTO"].map((item, i) => (
                        <div key={item} className={`rounded-md px-2 py-1.5 text-xs ${i === 0 ? "bg-indigo-500/10 text-indigo-400" : "text-[var(--tt-text-muted)]"}`}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mock main content */}
                  <div className="flex-1 space-y-4">
                    {/* Mock stats */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Active Now", value: "12", color: "#34D399" },
                        { label: "Hours Today", value: "86.4h", color: "#818CF8" },
                        { label: "Pending", value: "3", color: "#FBBF24" },
                        { label: "This Week", value: "$12,480", color: "#14B8A6" },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-[var(--tt-border-subtle)] bg-[var(--tt-card-bg)] p-3 sm:p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: stat.color, boxShadow: `0 0 6px ${stat.color}60` }} />
                            <span className="text-[10px] text-[var(--tt-text-muted)]">{stat.label}</span>
                          </div>
                          <p className="mt-1 font-mono text-lg font-bold sm:text-xl" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mock activity */}
                    <div className="rounded-xl border border-[var(--tt-border-subtle)] bg-[var(--tt-card-bg)] p-4">
                      <p className="text-xs font-semibold text-[var(--tt-text-muted)]">WHO&apos;S WORKING NOW</p>
                      <div className="mt-3 flex gap-4">
                        {["JW", "SK", "ML", "AR", "DP"].map((initials, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="relative">
                              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold ring-2 ring-emerald-400/40">
                                {initials}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400" />
                            </div>
                            <span className="font-mono text-[9px] text-[var(--tt-text-muted)]">{Math.floor(Math.random() * 6 + 1)}h {Math.floor(Math.random() * 59)}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
          <FadeInSection>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Ready to transform your workforce management?
            </h2>
            <p className="mt-4 text-lg text-[var(--tt-text-tertiary)]">Completely free while in beta. No credit card required.</p>
            <Link
              href="/auth/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-10 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(99,102,241,0.4)]"
              style={{ boxShadow: "0 0 30px rgba(99,102,241,0.25)" }}
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
          </FadeInSection>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[var(--tt-border-subtle)] bg-[var(--tt-sidebar-bg)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Clock size={16} className="text-white" />
                </div>
                <span className="text-lg font-bold">Time<span className="text-indigo-400">Tap</span></span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--tt-text-muted)]">
                Premium workforce management for modern teams.
              </p>
            </div>

            {/* Links */}
            {[
              { title: "Product", links: ["Features", "Changelog", "Roadmap"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Status"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tt-text-muted)]">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-[var(--tt-text-muted)] transition-colors hover:text-[var(--tt-text-secondary)]">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--tt-border-subtle)] pt-8 sm:flex-row">
            <p className="text-xs text-[var(--tt-text-faint)]">&copy; 2026 TimeTap. All rights reserved.</p>
            <div className="flex gap-4">
              {["Twitter", "GitHub", "LinkedIn"].map((s) => (
                <a key={s} href="#" className="text-xs text-[var(--tt-text-faint)] transition-colors hover:text-[var(--tt-text-tertiary)]">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
