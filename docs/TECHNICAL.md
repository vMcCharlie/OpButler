# Technical Documentation & Setup Guide

This guide covers the architecture, setup, and deployment of the OpButler project.

## 🏗️ Architecture

OpButler consists of two main components:

1.  **Frontend (Next.js)**: A responsive web dashboard for users to connect their wallets, view positions, and execute strategies.
2.  **Telegram Bot (Node.js/Grammy)**: A backend service that monitors user positions and sends proactive alerts. It serves as an **AI Risk Guard**, analyzing portfolio health and notifying users of potential risks or opportunities.

### Tech Stack

-   **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, Wagmi/Viem (Wallet Connection).
-   **Backend/Bot**: Node.js, Grammy.js (Telegram), Supabase (Database), Viem (Blockchain Interaction).
-   **Blockchain**: BNB Smart Chain (BSC).
-   **Protocols**: Venus, Kinza, Radiant.

## 🚀 Setup Guide

### prerequisites
-   Node.js v18+
-   NPM or Yarn
-   A Supabase project (for the Bot)
-   A Telegram Bot Token (from @BotFather)

### 1. Telegram Bot Setup

Navigate to the bot directory:
```bash
cd src/telegrambot
```

Install dependencies:
```bash
npm install
```

Configure Environment Variables:
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```
Required variables:
-   `TELEGRAM_BOT_TOKEN`: Your bot token.
-   `SUPABASE_URL`: Your Supabase project URL.
-   `SUPABASE_KEY`: Your Supabase service_role key (for backend access).
-   `RPC_URL`: BSC RPC Endpoint (e.g., https://bsc-dataseed.binance.org/).

Run the Bot:
```bash
npm run dev
```

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd src/frontend
```

Install dependencies:
```bash
npm install
```

Configure Environment Variables:
Copy `.env.example` to `.env.local` and fill in:
```bash
cp .env.example .env.local
```
Required variables:
-   `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Project ID from WalletConnect Cloud.

Run the Development Server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Demo Instructions

1.  **Connect Wallet**: On the frontend, click "Connect Wallet" and link your browser wallet (e.g., MetaMask).
2.  **View Dashboard**: See your aggregated net worth and positions across Venus, Kinza, and Radiant.
3.  **Simulate Strategy**: Go to "Top Strategies", select a loop (e.g., USDT/BNB), and enter "Simulation Mode" to architect your position.
4.  **Telegram Alert**:
    -   Start the bot on Telegram.
    -   Link your wallet address via the `/start` command.
    -   Trigger a manual report by typing "Check my health" or wait for proactive alerts.

## 📦 Deployment

### Frontend
Deploy easily on **Vercel**:
1.  Import the `src/frontend` directory as the root of your project.
2.  Add environment variables.
3.  Deploy.

### Telegram Bot
Deploy on a VPS or cloud provider (e.g., Railway, Heroku, DigitalOcean):
1.  Use a process manager like `pm2`.
2.  Start command: `npm start` (ensure it runs `node dist/bot.js` or `ts-node bot.ts`).
