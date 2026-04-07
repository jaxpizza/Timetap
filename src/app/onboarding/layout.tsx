import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dark px-4 py-12">
      {/* Animated gradient background */}
      <div
        className="pointer-events-none absolute inset-0 animate-[auth-gradient_12s_ease_infinite]"
        style={{
          background:
            "linear-gradient(135deg, #1E1B4B 0%, #09090B 25%, #312E81 50%, #09090B 75%, #1E1B4B 100%)",
          backgroundSize: "400% 400%",
        }}
      />

      {/* Dot pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #A5B4FC 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Radial glow behind card */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-timetap-primary-600/10 blur-[120px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[500px]">{children}</div>

      <style>{`
        @keyframes auth-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
