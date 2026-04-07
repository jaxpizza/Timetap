"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(251,113,133,0.1)" }}
      >
        <AlertCircle size={28} style={{ color: "#FB7185" }} />
      </div>
      <h2
        className="mt-5 font-heading text-xl font-bold"
        style={{ color: "var(--tt-text-primary)" }}
      >
        Something went wrong
      </h2>
      <p
        className="mt-2 max-w-sm text-sm"
        style={{ color: "var(--tt-text-tertiary)" }}
      >
        An unexpected error occurred. Please try again or contact support if the
        problem persists.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
      >
        <RotateCcw size={14} />
        Try Again
      </button>
    </div>
  );
}
