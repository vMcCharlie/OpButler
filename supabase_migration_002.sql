-- =============================================
-- OpButler Migration #002: Add Alert Cooldown
-- =============================================
-- Run this in Supabase SQL Editor AFTER supabase_schema.sql

-- Add last_alert_sent column for per-user alert cooldown tracking
-- Prevents spamming the same alert within a short period
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS last_alert_sent timestamp with time zone;

-- Optional: Add index for efficient polling queries
CREATE INDEX IF NOT EXISTS idx_users_alerts_enabled 
  ON public.users(alerts_enabled) 
  WHERE alerts_enabled = true;
