"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Plus, Trash2, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPremium } from "@/components/ui/select-premium";
import { updateOrganization, createLocation, deleteLocation, regenerateInviteCode } from "./actions";
import { DynamicLocationMapPicker, DynamicLocationMapView } from "@/components/dynamic-map";

interface Org { id: string; name: string; timezone: string; pay_period_type: string; overtime_threshold_weekly: number; overtime_multiplier: number; invite_code: string; geofence_required?: boolean }
interface Location { id: string; name: string; address: string | null; city: string | null; state: string | null; zip: string | null; latitude: number | null; longitude: number | null; radius_meters?: number }

const tzOptions = [
  { value: "America/New_York", label: "Eastern (ET)" }, { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" }, { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" }, { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
];
const ppOptions = [
  { value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Bi-weekly" },
  { value: "semimonthly", label: "Semi-monthly" }, { value: "monthly", label: "Monthly" },
];

export function SettingsClient({ org, locations, organizationId }: { org: any; locations: Location[]; organizationId: string }) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(org?.name ?? "");
  const [tz, setTz] = useState(org?.timezone ?? "America/Chicago");
  const [ppType, setPpType] = useState(org?.pay_period_type ?? "biweekly");
  const [otThreshold, setOtThreshold] = useState(String(org?.overtime_threshold_weekly ?? 40));
  const [otMult, setOtMult] = useState(String(org?.overtime_multiplier ?? 1.5));
  const [geofence, setGeofence] = useState(org?.geofence_required ?? false);
  const [inviteCode, setInviteCode] = useState(org?.invite_code ?? "");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [addingLoc, setAddingLoc] = useState(false);

  async function saveOrg() {
    setLoading("org");
    await updateOrganization(organizationId, { name: orgName, timezone: tz });
    setLoading(null);
    toast.success("Saved");
    router.refresh();
  }

  async function savePayroll() {
    setLoading("payroll");
    await updateOrganization(organizationId, { pay_period_type: ppType, overtime_threshold_weekly: Number(otThreshold), overtime_multiplier: Number(otMult) });
    setLoading(null);
    toast.success("Saved");
  }

  async function toggleGeofence(val: boolean) {
    setGeofence(val);
    await updateOrganization(organizationId, { geofence_required: val });
    toast.success(val ? "Location tracking enabled" : "Location tracking disabled");
  }

  async function handleRegenCode() {
    setLoading("regen");
    const r = await regenerateInviteCode(organizationId, orgName);
    setLoading(null);
    if (r.success) { setInviteCode(r.code!); toast.success("New code generated"); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Settings</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Manage your organization</p>

      {/* Organization */}
      <Section title="Organization" className="mt-6">
        <Field label="Company name"><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></Field>
        <Field label="Timezone"><SelectPremium value={tz} onValueChange={setTz} options={tzOptions} /></Field>
        <Button onClick={saveOrg} disabled={loading === "org"} className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600">
          {loading === "org" ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </Section>

      {/* Payroll */}
      <Section title="Payroll Settings">
        <Field label="Pay period type"><SelectPremium value={ppType} onValueChange={setPpType} options={ppOptions} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="OT threshold (hrs/week)"><Input type="number" value={otThreshold} onChange={(e) => setOtThreshold(e.target.value)} /></Field>
          <Field label="OT multiplier"><Input type="number" step="0.1" value={otMult} onChange={(e) => setOtMult(e.target.value)} /></Field>
        </div>
        <Button onClick={savePayroll} disabled={loading === "payroll"} className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600">
          {loading === "payroll" ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </Section>

      {/* Location Tracking */}
      <div className="mt-6 rounded-xl p-6" style={{ backgroundColor: "var(--tt-card-bg)", border: `1px solid ${geofence ? "rgba(99,102,241,0.3)" : "var(--tt-border-subtle)"}` }}>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Location Tracking</p>

        {/* Toggle Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.1)" }}>
              <MapPin size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Track Clock-in Locations</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--tt-text-tertiary)" }}>Record where employees clock in and out</p>
            </div>
          </div>
          {/* Visible custom toggle since the shadcn Switch is invisible with our theme tokens */}
          <button
            onClick={() => toggleGeofence(!geofence)}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200"
            style={{ backgroundColor: geofence ? "#6366F1" : "var(--tt-border)" }}
            role="switch"
            aria-checked={geofence}
          >
            <span
              className="pointer-events-none block size-5 rounded-full shadow-sm transition-transform duration-200"
              style={{
                backgroundColor: "#fff",
                transform: geofence ? "translateX(22px)" : "translateX(2px)",
              }}
            />
          </button>
        </div>

        {!geofence && (
          <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-muted)" }}>
            Enable location tracking to set up work locations and track where employees clock in
          </p>
        )}

        {geofence && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="mt-6 space-y-4">
            <p className="text-xs leading-relaxed" style={{ color: "var(--tt-text-tertiary)" }}>
              Clock-in locations are always recorded when tracking is enabled. Adding work locations below is optional — it lets you set a geofence to automatically detect on-site vs off-site clock-ins.
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Work Locations</p>

            {locations.map((loc) => (
              <LocationCard key={loc.id} location={loc} onDelete={async () => {
                await deleteLocation(loc.id);
                toast.success("Deleted");
                router.refresh();
              }} />
            ))}

            {locations.length === 0 && !addingLoc && (
              <p className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-muted)" }}>
                No work locations set up yet. Add one to enable geofence detection.
              </p>
            )}

            {addingLoc ? (
              <AddLocationForm organizationId={organizationId} onDone={() => { setAddingLoc(false); router.refresh(); }} onCancel={() => setAddingLoc(false)} />
            ) : (
              <button onClick={() => setAddingLoc(true)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
                style={{ border: "1px dashed rgba(99,102,241,0.3)" }}>
                <Plus size={16} /> Add Work Location
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Invite Code */}
      <Section title="Invite Code">
        <div className="flex items-center gap-3">
          <p className="font-mono text-lg font-semibold tracking-[0.15em]" style={{ color: "var(--tt-text-primary)" }}>{inviteCode}</p>
          <button onClick={handleCopy} className="flex size-7 items-center justify-center rounded-md transition-colors" style={{ color: copied ? "#34D399" : "var(--tt-text-muted)" }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button onClick={handleRegenCode} disabled={loading === "regen"} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            {loading === "regen" ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw size={12} />} Regenerate
          </button>
        </div>
      </Section>
    </motion.div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-6 rounded-xl p-5 ${className}`} style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>{title}</p>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>{label}</Label>{children}</div>;
}

function LocationCard({ location: loc, onDelete }: { location: Location; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const radiusFt = loc.radius_meters ? Math.round(Number(loc.radius_meters) * 3.28084) : 0;
  const radiusLabel = radiusFt >= 5280 ? `${(radiusFt / 5280).toFixed(1)} mi` : `${radiusFt} ft`;
  const hasCoords = loc.latitude != null && loc.longitude != null;

  return (
    <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
      {hasCoords && (
        <DynamicLocationMapView
          workLocations={[{ lat: Number(loc.latitude), lng: Number(loc.longitude), name: loc.name, radiusMeters: Number(loc.radius_meters ?? 402) }]}
          clockPoints={[]}
          height={150}
        />
      )}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500/10"><MapPin size={14} className="text-indigo-400" /></div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{loc.name}</p>
            <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>
              {[loc.address, loc.city, loc.state].filter(Boolean).join(", ")}
              {radiusFt > 0 && ` · Geofence: ${radiusLabel}`}
            </p>
          </div>
        </div>
        <button onClick={async () => { setDeleting(true); await onDelete(); setDeleting(false); }} disabled={deleting}
          className="flex size-7 items-center justify-center rounded-md text-rose-400 hover:bg-rose-500/10">
          {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

function AddLocationForm({ organizationId, onDone, onCancel }: { organizationId: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [radiusFeet, setRadiusFeet] = useState(1320);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error("Location name required"); return; }
    if (!lat || !lng) { toast.error("Select a location on the map"); return; }
    setLoading(true);
    const r = await createLocation({
      organizationId, name: name.trim(), address, city: "", state: "", zip: "",
      latitude: lat, longitude: lng, radius_meters: Math.round(radiusFeet * 0.3048),
    });
    setLoading(false);
    r.success ? (toast.success("Location added"), onDone()) : toast.error(r.error || "Failed");
  }

  return (
    <div className="space-y-4 rounded-lg p-4" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
      <Field label="Location name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Main Office" />
      </Field>

      <DynamicLocationMapPicker
        initialLat={lat ?? undefined}
        initialLng={lng ?? undefined}
        initialRadius={Math.round(radiusFeet * 0.3048)}
        onLocationChange={(newLat: number, newLng: number, addr: string) => { setLat(newLat); setLng(newLng); if (addr) setAddress(addr); }}
        onRadiusChange={(feet: number) => setRadiusFeet(feet)}
      />

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Save Location"}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Cancel</Button>
      </div>
    </div>
  );
}
