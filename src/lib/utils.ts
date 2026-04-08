import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" && !date.includes("T") ? parseLocalDate(date) : new Date(date)
  return format(d, "MMM dd, yyyy")
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "h:mm a")
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" && !date.includes("T") ? parseLocalDate(date) : new Date(date)
  return format(d, "MMM dd, yyyy 'at' h:mm a")
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Parse a date-only string (YYYY-MM-DD) as local noon to avoid UTC-offset drift. */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00")
}
/** @deprecated Use parseLocalDate instead */
export const parseDateLocal = parseLocalDate

/** Format a Date to YYYY-MM-DD using local time (avoids the toISOString UTC bug). */
export function toLocalDateString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
/** @deprecated Use toLocalDateString instead */
export const toLocalDateStr = toLocalDateString

/** Get start of today in local timezone. */
export function startOfLocalToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Get start of week (Sunday) in local timezone. */
export function startOfLocalWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

/** Haversine distance between two lat/lng points, in meters. */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim()?.[0]?.toUpperCase() ?? ""
  const last = lastName?.trim()?.[0]?.toUpperCase() ?? ""
  return (first + last) || "?"
}
