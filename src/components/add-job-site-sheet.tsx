"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicLocationMapPicker } from "@/components/dynamic-map";
import { createJobSite } from "@/app/admin/job-sites/actions";

const durationPresets = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
];

export function AddJobSiteSheet({ open, onOpenChange, organizationId }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organizationId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [radiusFeet, setRadiusFeet] = useState(300);
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const expiresAt = addDays(new Date(), durationDays);

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Enter a job site name"); return; }
    if (!lat || !lng) { toast.error("Select a location on the map"); return; }

    setLoading(true);
    const r = await createJobSite({
      organizationId,
      name: name.trim(),
      address,
      latitude: lat,
      longitude: lng,
      radiusMeters: Math.round(radiusFeet * 0.3048),
      durationDays,
    });
    setLoading(false);

    if (r.success) {
      const msg = r.retroactiveUpdates && r.retroactiveUpdates > 0
        ? `Job site added. ${r.retroactiveUpdates} clock-in${r.retroactiveUpdates > 1 ? "s" : ""} retroactively updated.`
        : "Job site added";
      toast.success(msg);
      setName(""); setLat(null); setLng(null); setAddress(""); setDurationDays(7);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(r.error || "Failed to create job site");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[480px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle className="flex items-center gap-2 font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>
            <MapPin size={18} className="text-teal-400" />
            Add Job Site
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Job site name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Johnson Renovation" />
          </div>

          {/* Map */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Location</Label>
            <DynamicLocationMapPicker
              initialLat={lat ?? undefined}
              initialLng={lng ?? undefined}
              initialRadius={Math.round(radiusFeet * 0.3048)}
              onLocationChange={(newLat: number, newLng: number, addr: string) => { setLat(newLat); setLng(newLng); if (addr) setAddress(addr); }}
              onRadiusChange={(feet: number) => setRadiusFeet(feet)}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Duration</Label>
            <div className="flex flex-wrap gap-1.5">
              {durationPresets.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setDurationDays(p.days)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: durationDays === p.days ? "rgba(20,184,166,0.15)" : "var(--tt-elevated-bg)",
                    color: durationDays === p.days ? "#14B8A6" : "var(--tt-text-muted)",
                    border: `1px solid ${durationDays === p.days ? "rgba(20,184,166,0.3)" : "var(--tt-border-faint)"}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>
              Active until: <span style={{ color: "var(--tt-text-primary)" }}>{format(expiresAt, "MMM d, yyyy")}</span>
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 w-full rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Add Job Site"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
