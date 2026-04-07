"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/components/theme-provider";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const DARK_TILES = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png";
const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

interface WorkLocation { lat: number; lng: number; name: string; radiusMeters: number }
interface ClockPoint { lat: number; lng: number; onSite: boolean | null; label: string }

export default function LocationMapView({ workLocations = [], clockPoints = [], height = 400, center, zoom }: {
  workLocations?: WorkLocation[]; clockPoints?: ClockPoint[]; height?: number;
  center?: [number, number]; zoom?: number;
}) {
  const { theme } = useTheme();
  const tiles = theme === "dark" ? DARK_TILES : LIGHT_TILES;

  // Calculate center from data
  const allLats = [...workLocations.map((l) => l.lat), ...clockPoints.map((p) => p.lat)];
  const allLngs = [...workLocations.map((l) => l.lng), ...clockPoints.map((p) => p.lng)];
  const defaultCenter: [number, number] = allLats.length > 0
    ? [allLats.reduce((a, b) => a + b, 0) / allLats.length, allLngs.reduce((a, b) => a + b, 0) / allLngs.length]
    : [39.8283, -98.5795];

  // Collect all points for auto-fit
  const fitPoints: [number, number][] = [
    ...workLocations.map((l) => [l.lat, l.lng] as [number, number]),
    ...clockPoints.map((p) => [p.lat, p.lng] as [number, number]),
  ];

  return (
    <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--tt-border-subtle)", height }}>
      <MapContainer center={center ?? defaultCenter} zoom={zoom ?? (allLats.length > 0 ? 13 : 4)} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url={tiles} attribution='&copy; OpenStreetMap' />
        {!center && fitPoints.length > 0 && <FitBounds points={fitPoints} />}
        {workLocations.map((loc, i) => (
          <Circle key={`wl-${i}`} center={[loc.lat, loc.lng]} radius={loc.radiusMeters}
            pathOptions={{ fillColor: "#6366F1", fillOpacity: 0.12, color: "#6366F1", opacity: 0.4, weight: 2 }}>
            <Popup><strong>{loc.name}</strong><br />Geofence: {Math.round(loc.radiusMeters * 3.28084)} ft</Popup>
          </Circle>
        ))}
        {clockPoints.map((pt, i) => (
          <Marker key={`cp-${i}`} position={[pt.lat, pt.lng]} icon={pt.onSite ? greenIcon : redIcon}>
            <Popup>{pt.label}<br />{pt.onSite ? "✅ On-site" : "❌ Off-site"}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(L.latLng(points[0][0], points[0][1]), 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [map, points]);
  return null;
}
