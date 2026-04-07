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
  Play,
  Menu,
  X,
  Check,
  ArrowRight,
  Users,
  Shield,
  BarChart3,
  ChevronRight,
} from "lucide-react";

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

/* ── pricing data ── */

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    desc: "For small teams getting started",
    features: ["Up to 5 employees", "Time clock & breaks", "Basic scheduling", "PTO requests", "Mobile access"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$8",
    period: "/employee/mo",
    desc: "For growing businesses",
    features: ["Up to 50 employees", "Everything in Free", "Payroll processing", "Location tracking", "AI insights", "Priority support"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organizations",
    features: ["Unlimited employees", "Everything in Pro", "API access", "Custom integrations", "Dedicated account manager", "SLA guarantee"],
    cta: "Contact Sales",
    popular: false,
  },
];

/* ── main page ── */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-x-hidden">
      {/* ═══ NAV ═══ */}
      <nav
        className="fixed top-0 z-50 w-full transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(9,9,11,0.85)" : "transparent",
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
            <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-white">Features</a>
            <a href="#pricing" className="text-sm text-zinc-400 transition-colors hover:text-white">Pricing</a>
            <a href="#preview" className="text-sm text-zinc-400 transition-colors hover:text-white">Preview</a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/auth/login" className="text-sm text-zinc-400 transition-colors hover:text-white">Sign In</Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex size-9 items-center justify-center rounded-lg md:hidden" style={{ color: "var(--tt-text-tertiary, #71717A)" }}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-zinc-800/50 md:hidden"
              style={{ backgroundColor: "rgba(9,9,11,0.95)", backdropFilter: "blur(20px)" }}
            >
              <div className="flex flex-col gap-1 px-5 py-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/50">Features</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/50">Pricing</a>
                <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/50">Preview</a>
                <div className="my-2 h-px bg-zinc-800/50" />
                <Link href="/auth/login" className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/50">Sign In</Link>
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
          className="relative z-10 mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg md:text-xl"
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
          <button className="flex items-center gap-2 rounded-xl border border-zinc-700 px-8 py-4 text-base font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white">
            <Play size={16} fill="currentColor" />
            Watch Demo
          </button>
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
            className="flex size-10 items-center justify-center rounded-full border border-zinc-800"
          >
            <ChevronRight size={16} className="rotate-90 text-zinc-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="border-y border-zinc-800/40 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-5 text-center">
          <p className="text-sm font-medium text-zinc-500">Built for teams of all sizes</p>
          <div className="flex items-center gap-3">
            {[Users, Shield, BarChart3, Clock].map((Icon, i) => (
              <div key={i} className="flex size-9 items-center justify-center rounded-lg border border-zinc-800/60 bg-zinc-900/50">
                <Icon size={16} className="text-zinc-600" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="size-2 rounded-full bg-indigo-500/60" />
            ))}
            <span className="ml-2 text-sm text-zinc-500">Thousands of hours tracked</span>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeInSection className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Everything your team needs</h2>
            <p className="mt-4 text-lg text-zinc-400">One platform to replace them all</p>
          </FadeInSection>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 0.08}>
                <div
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:border-indigo-500/20"
                  style={{ backgroundColor: "#0F0F12", border: "1px solid rgba(39,39,42,0.4)" }}
                >
                  {/* Colored top accent line */}
                  <div className="absolute left-0 right-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }} />
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: f.bg }}>
                    <f.icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
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
            <p className="mt-4 text-lg text-zinc-400">A command center for your entire workforce</p>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div
              className="mt-16 overflow-hidden rounded-xl border border-zinc-800/60"
              style={{ perspective: "1200px", boxShadow: "0 40px 80px rgba(99,102,241,0.1), 0 0 0 1px rgba(99,102,241,0.05)" }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-zinc-800/60 bg-[#0F0F12] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-zinc-700" />
                  <span className="size-3 rounded-full bg-zinc-700" />
                  <span className="size-3 rounded-full bg-zinc-700" />
                </div>
                <div className="mx-auto flex h-7 w-72 items-center justify-center rounded-md bg-zinc-900/80 text-xs text-zinc-500">
                  timetap.live/admin
                </div>
              </div>

              {/* Mock dashboard */}
              <div className="bg-[#09090B] p-4 sm:p-6">
                <div className="flex gap-4">
                  {/* Mock sidebar */}
                  <div className="hidden w-48 shrink-0 space-y-1 rounded-xl border border-zinc-800/40 bg-[#050507] p-3 lg:block">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <div className="size-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600" />
                      <span className="text-xs font-bold text-zinc-300">TimeTap</span>
                    </div>
                    <div className="mt-3 space-y-0.5">
                      {["Dashboard", "Employees", "Time Clock", "Timesheets", "Payroll", "Schedule", "PTO"].map((item, i) => (
                        <div key={item} className={`rounded-md px-2 py-1.5 text-xs ${i === 0 ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-500"}`}>
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
                        <div key={stat.label} className="rounded-xl border border-zinc-800/40 bg-[#0A0A0D] p-3 sm:p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: stat.color, boxShadow: `0 0 6px ${stat.color}60` }} />
                            <span className="text-[10px] text-zinc-500">{stat.label}</span>
                          </div>
                          <p className="mt-1 font-mono text-lg font-bold sm:text-xl" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mock activity */}
                    <div className="rounded-xl border border-zinc-800/40 bg-[#0A0A0D] p-4">
                      <p className="text-xs font-semibold text-zinc-500">WHO&apos;S WORKING NOW</p>
                      <div className="mt-3 flex gap-4">
                        {["JW", "SK", "ML", "AR", "DP"].map((initials, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="relative">
                              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold ring-2 ring-emerald-400/40">
                                {initials}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400" />
                            </div>
                            <span className="font-mono text-[9px] text-zinc-500">{Math.floor(Math.random() * 6 + 1)}h {Math.floor(Math.random() * 59)}m</span>
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

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <FadeInSection className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-zinc-400">Start free. Scale as you grow.</p>
          </FadeInSection>

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan, i) => (
              <FadeInSection key={plan.name} delay={i * 0.1}>
                <div
                  className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${plan.popular ? "scale-[1.02] md:scale-105" : ""}`}
                  style={{
                    backgroundColor: "#0F0F12",
                    border: plan.popular ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(39,39,42,0.4)",
                    boxShadow: plan.popular ? "0 0 40px rgba(99,102,241,0.08)" : undefined,
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1 text-xs font-bold">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-zinc-500">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">{plan.desc}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                        <Check size={14} style={{ color: plan.popular ? "#818CF8" : "#34D399" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/signup"
                    className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]"
                        : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeInSection>
            ))}
          </div>
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
            <p className="mt-4 text-lg text-zinc-400">Start free. No credit card required.</p>
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
      <footer className="border-t border-zinc-800/40 bg-[#050507]">
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
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                Premium workforce management for modern teams.
              </p>
            </div>

            {/* Links */}
            {[
              { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Status"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/40 pt-8 sm:flex-row">
            <p className="text-xs text-zinc-600">&copy; 2026 TimeTap. All rights reserved.</p>
            <div className="flex gap-4">
              {["Twitter", "GitHub", "LinkedIn"].map((s) => (
                <a key={s} href="#" className="text-xs text-zinc-600 transition-colors hover:text-zinc-400">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
