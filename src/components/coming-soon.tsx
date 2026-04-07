"use client";

import { motion } from "framer-motion";
import type { ComponentType, SVGProps } from "react";

export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center pt-20"
    >
      <div
        className="flex size-24 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--tt-elevated-bg)" }}
      >
        <Icon size={48} strokeWidth={1.2} style={{ color: "var(--tt-text-faint)" }} />
      </div>
      <h1
        className="mt-6 font-heading text-xl font-bold"
        style={{ color: "var(--tt-text-primary)" }}
      >
        {title}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
        {subtitle}
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--tt-text-muted)" }}>
        This feature is under development
      </p>
    </motion.div>
  );
}
