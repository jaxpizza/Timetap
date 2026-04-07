"use client";

import dynamic from "next/dynamic";

export const DynamicLocationMapPicker = dynamic(
  () => import("./location-map-picker"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[300px] items-center justify-center rounded-xl text-sm"
        style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-muted)" }}
      >
        Loading map...
      </div>
    ),
  }
);

export const DynamicLocationMapView = dynamic(
  () => import("./location-map-view"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[200px] items-center justify-center rounded-xl text-sm"
        style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-muted)" }}
      >
        Loading map...
      </div>
    ),
  }
);
