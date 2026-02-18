# Supabase Database Setup

This folder contains the SQL migrations required for **OpButler**.

## 🚀 Setup Instructions

1.  Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to your project.
3.  Open the **SQL Editor** from the left-hand sidebar.
4.  Copy the contents of **[migrations.sql](./migrations.sql)**.
5.  Paste it into the editor and click **Run**.

## 📊 Schema Overview

The main table is `public.users`, which stores:
-   **Telegram identity** (`chat_id`, `username`).
-   **Wallet address** linked to the user.
-   **Risk preferences** (alert thresholds, polling intervals).
-   **Daily briefing** preferences.
-   **State** (last check timestamps, cooldown timers).

## 🔒 Security

We use **Row Level Security (RLS)**. The migrations enable a policy that allows the `service_role` (used by the Telegram Agent backend) full access to manage user data.
