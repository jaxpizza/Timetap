-- Add geolocation columns to time_entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_latitude numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_longitude numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_accuracy numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_latitude numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_longitude numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_accuracy numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_on_site boolean;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_on_site boolean;

-- Add radius to locations (in meters, default ~400m ≈ ¼ mile)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS radius_meters numeric DEFAULT 402;

-- Add geofence_required to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS geofence_required boolean DEFAULT false;
