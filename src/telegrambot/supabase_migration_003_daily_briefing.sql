-- Migration 003: Add support for Daily Briefing & Agent Pulse

-- 1. Add 'daily_updates_enabled' column (Default: TRUE)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS daily_updates_enabled BOOLEAN DEFAULT TRUE;

-- 2. Add 'last_daily_report_sent' column (Nullable)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_daily_report_sent TIMESTAMPTZ;

-- 3. Comment explaining new columns
COMMENT ON COLUMN public.users.daily_updates_enabled IS 'User preference for receiving proactive daily portfolio briefings';
COMMENT ON COLUMN public.users.last_daily_report_sent IS 'Timestamp of the last successfully sent daily briefing';
