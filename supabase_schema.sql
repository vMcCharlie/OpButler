
-- =============================================
-- OpButler Database Schema
-- =============================================
-- Run this in Supabase SQL Editor to set up the database.

-- Drop existing table if you need to reset (CAREFUL in production!)
-- drop table if exists public.users;

-- Create Users Table
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  chat_id bigint not null unique,
  username text,
  wallet_address text not null,
  alert_threshold numeric default 1.1,
  polling_interval integer default 60, -- Minutes: 60, 120, 360, 720, 960, 1440
  last_checked timestamp with time zone default timezone('utc'::text, now()),
  alerts_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraints
  constraint wallet_address_check check (length(wallet_address) = 42),
  constraint polling_interval_check check (polling_interval in (60, 120, 360, 720, 960, 1440))
);

-- Create index for faster lookups
create index if not exists idx_users_wallet on public.users(wallet_address);
create index if not exists idx_users_chat_id on public.users(chat_id);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Policy: Allow full access for service role (bot backend)
create policy "Service role full access" on public.users
  for all
  using (true)
  with check (true);

-- =============================================
-- Migration Script (if table already exists)
-- =============================================
-- Run these ALTER statements if you already have the users table:

-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS polling_interval integer default 60;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_checked timestamp with time zone default now();
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS alerts_enabled boolean default true;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default now();
-- ALTER TABLE public.users ADD CONSTRAINT polling_interval_check CHECK (polling_interval in (60, 120, 360, 720, 960, 1440));
