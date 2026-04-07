"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const DARK_TILES = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png";
const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const RADIUS_MIN = 100;
const RADIUS_MAX = 5280;

interface Props {
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  onRadiusChange: (radiusFeet: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 15, { duration: 1 }); }, [lat, lng, map]);
  return null;
}

export default function LocationMapPicker({ initialLat, initialLng, initialRadius = 402, onLocationChange, onRadiusChange }: Props) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [lat, setLat] = useState(initialLat ?? 39.8283);
  const [lng, setLng] = useState(initialLng ?? -98.5795);
  const [hasPin, setHasPin] = useState(!!(initialLat && initialLng));
  const [radiusFeet, setRadiusFeet] = useState(Math.round((initialRadius / 0.3048)));
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>(undefined);

  const radiusMeters = radiusFeet * 0.3048;
  const tiles = theme === "dark" ? DARK_TILES : LIGHT_TILES;

  const [showDropdown, setShowDropdown] = useState(false);

  function handleSearch(q: string) {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 3) { setResults([]); setShowDropdown(false); return; }
    setShowDropdown(true);
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=us`,
          { headers: { "Accept": "application/json" } }
        );
        const data = await res.json();
        setResults(data);
      } catch { setResults([]); }
      setSearching(false);
    }, 500);
  }

  function selectResult(r: any) {
    const newLat = parseFloat(r.lat);
    const newLng = parseFloat(r.lon);
    setLat(newLat);
    setLng(newLng);
    setHasPin(true);
    setResults([]);
    setShowDropdown(false);
    setQuery(r.display_name);
    onLocationChange(newLat, newLng, r.display_name);
  }

  function handleMapClick(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    setHasPin(true);
    onLocationChange(newLat, newLng, "");
  }

  function handleRadiusChange(feet: number) {
    setRadiusFeet(feet);
    onRadiusChange(feet);
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg px-3" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border)" }}>
          <Search size={14} className="shrink-0" style={{ color: "var(--tt-text-muted)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search address..."
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[var(--tt-text-muted)]"
            style={{ color: "var(--tt-text-primary)" }}
          />
        </div>
        {showDropdown && (
          <div
            className="absolute left-0 right-0 top-full mt-1 max-h-[200px] overflow-y-auto rounded-lg"
            style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border)", zIndex: 9999, boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
          >
            {searching && results.length === 0 && (
              <p className="px-3 py-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>Searching...</p>
            )}
            {!searching && results.length === 0 && query.length >= 3 && (
              <p className="px-3 py-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No results found</p>
            )}
            {results.map((r: any, i: number) => (
              <div
                key={i}
                onClick={() => selectResult(r)}
                className="cursor-pointer px-3 py-2.5 text-sm transition-colors"
                style={{ color: "var(--tt-text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--tt-elevated-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="mt-0.5 shrink-0" style={{ color: "var(--tt-text-muted)" }} />
                  <span className="line-clamp-2 text-xs" style={{ color: "var(--tt-text-secondary)" }}>{r.display_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--tt-border-subtle)", height: 300 }}>
        <MapContainer center={[lat, lng]} zoom={hasPin ? 15 : 4} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url={tiles} attribution='&copy; OpenStreetMap' />
          <MapClickHandler onMapClick={handleMapClick} />
          {hasPin && <FlyTo lat={lat} lng={lng} />}
          {hasPin && <Marker position={[lat, lng]} />}
          {hasPin && (
            <Circle center={[lat, lng]} radius={radiusMeters}
              pathOptions={{ fillColor: "#6366F1", fillOpacity: 0.15, color: "#6366F1", opacity: 0.4, weight: 2 }} />
          )}
        </MapContainer>
      </div>

      {/* Coordinates */}
      {hasPin && (
        <p className="font-mono text-xs" style={{ color: "var(--tt-text-muted)" }}>
          Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
        </p>
      )}

      {/* Radius slider */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Geofence Radius</label>
          <span className="text-xs" style={{ color: "var(--tt-text-primary)" }}>
            {radiusFeet} ft ({(radiusFeet / 5280).toFixed(2)} mi)
          </span>
        </div>
        <input type="range" min={RADIUS_MIN} max={RADIUS_MAX} step={50} value={radiusFeet}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="mt-1 w-full accent-indigo-500" />
        <div className="mt-1 flex gap-1">
          {[{ label: "¼ mi", feet: 1320 }, { label: "½ mi", feet: 2640 }, { label: "1 mi", feet: 5280 }].map((p) => (
            <button key={p.label} type="button" onClick={() => handleRadiusChange(p.feet)}
              className="rounded px-2 py-0.5 text-[10px] transition-colors"
              style={{ backgroundColor: radiusFeet === p.feet ? "rgba(99,102,241,0.15)" : "var(--tt-elevated-bg)", color: radiusFeet === p.feet ? "#818CF8" : "var(--tt-text-muted)", border: "1px solid var(--tt-border-faint)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
