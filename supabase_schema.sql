
-- Create Users Table for OpButler Bot
create table public.users (
  id uuid default gen_random_uuid() primary key,
  chat_id bigint not null unique,
  username text,
  wallet_address text not null unique,
  alert_threshold numeric default 1.1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraints
  constraint wallet_address_check check (length(wallet_address) = 42)
);

-- Enable Row Level Security (RLS) - Optional for Bot, but good practice
alter table public.users enable row level security;

-- Policy: Allow full access if using Service Key (or setup more restrictive policies if app accesses it directly)
create policy "Allow full access for service role" on public.users
  for all
  using (true)
  with check (true);
