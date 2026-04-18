"use client";

import { useState } from "react";
import { Building2, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { joinAdditionalOrg } from "@/app/onboarding/actions";

export function AddCompanySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    const r = await joinAdditionalOrg(code.trim());
    setLoading(false);
    if (r.success) {
      setSuccess(r.orgName ?? "the company");
      toast.success("Request sent!");
    } else {
      toast.error(r.error || "Failed");
    }
  }

  function handleClose(o: boolean) {
    if (!o) {
      setCode("");
      setSuccess(null);
    }
    onOpenChange(o);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>Add Company</SheetTitle>
          <SheetDescription className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            Enter the invite code provided by the company admin to request access.
          </SheetDescription>
        </SheetHeader>

        {success ? (
          <div className="mt-6 flex flex-col items-center rounded-xl p-6 text-center" style={{ backgroundColor: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.3)" }}>
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle size={24} className="text-emerald-400" />
            </div>
            <p className="mt-3 text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Request sent!</p>
            <p className="mt-1 text-xs" style={{ color: "var(--tt-text-tertiary)" }}>
              The admin at <span style={{ color: "var(--tt-text-primary)" }}>{success}</span> will review your request. You&apos;ll see the company in your switcher once approved.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-4 w-full bg-amber-500 text-white hover:bg-amber-600">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Invite Code</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-1234"
                  className="pl-9 font-mono tracking-widest"
                  autoFocus
                />
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--tt-text-muted)" }}>
                Ask the company admin for their invite code
              </p>
            </div>
            <Button type="submit" disabled={loading || !code.trim()} className="w-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Request Access"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
