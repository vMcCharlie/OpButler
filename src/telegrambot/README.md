# OpButler AI Risk Agent (Telegram Bot)

This is the backend service for **OpButler**. It acts as an autonomous "AI Risk Concierge" that monitors user positions on the BNB Chain 24/7.

## 🤖 Features
-   **Real-time Monitoring**: Checks Health Factors on Venus, Kinza, and Radiant.
-   **Gemini AI Integration**: Analyzes portfolio data to provide natural language risk assessments.
-   **Instant Alerts**: Sends Telegram notifications if a user is near liquidation.

## 🚀 Getting Started

### Prerequisites
-   Node.js 18+
-   A **Supabase** Project (for user database)
-   A **Telegram Bot Token** (from @BotFather)
-   **Google Gemini API Key** (for AI insights)

### Installation

1.  Navigate to the bot directory:
    ```bash
    cd src/telegrambot
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

    Fill in your `.env` file:
    ```env
    TELEGRAM_BOT_TOKEN=your_bot_token_here
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_KEY=your_supabase_service_role_key
    GEMINI_API_KEY=your_google_gemini_key
    RPC_URL=https://bsc-dataseed.binance.org/
    ```

### Database Setup

Run the SQL migration in your Supabase SQL Editor to create the users table:

```sql
create table public.users (
  id uuid not null default gen_random_uuid (),
  chat_id bigint not null,
  username text null,
  wallet_address text null,
  alert_threshold numeric null default 1.1,
  polling_interval integer null default 60,
  alerts_enabled boolean null default true,
  last_checked timestamp with time zone null,
  last_alert_sent timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_chat_id_key unique (chat_id)
) tablespace pg_default;
```

### Running the Bot

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

## 🛠️ Commands
-   `/start`: Link your wallet and initialize the agent.
-   `/analyze`: Request an AI-powered portfolio report.
-   `/settings`: View or change alert thresholds.
-   `/help`: See all commands.
