# Technical Architecture & Setup

This guide provides the technical foundation for reproducing the **OpButler** environment.

## 🏗️ Technical Architecture

OpButler is built on a distributed agentic stack:

1.  **Frontend (Next.js 14)**: The primary interaction layer. It uses `wagmi` for secure on-chain connectivity and `viem` for blazing-fast state reads.
2.  **Agent Logic (Node.js)**: The core "Brain". This service polls the BSC RPC, calculates Health Factors across protocols, and passes data to **Gemini API** for risk synthesis.
3.  **Database (Supabase)**: Stores persistent user preferences and allows for 24/7 alert persistence.

---

## 🚀 Setup & Reproduction

### 1. Database Initialization
Deploy the schema in **[src/supabase/migrations.sql](../src/supabase/migrations.sql)**.
This establishes the foundation for user state and alert thresholds.

### 2. AI Risk Agent Configuration
Navigate to `src/telegrambot`, install dependencies, and configure your secrets.
```bash
cd src/telegrambot
npm install
npm run start
```
![Bot Start](../src/telegrambot/screenshots/start.png)

### 3. Dashboard Connectivity
Navigate to `src/frontend`, install dependencies, and start the development server.
```bash
cd src/frontend
npm install
npm run dev
```

---

## 🧪 Verification & Demo Guide

### Step 1: Link your Wallet
Go to Settings on the Dashboard and type your Telegram ID.
![Link Account](../src/frontend/screenshots/telegram-link.png)

### Step 2: verify on Telegram
Use the `/verify` command to securely link your wallet to the Agent.
![Verify Command](../src/telegrambot/screenshots/verify.png)

### Step 3: Global Portfolio Synthesis
Navigate to the Portfolio page to see your aggregated positions and AI-driven insights.
![Portfolio View](../src/frontend/screenshots/portfolio.png)

### Step 4: AI Analysis Command
Ask the bot for a detailed risk audit.
![AI Analyze](../src/telegrambot/screenshots/analyze.png)

---

## 📦 Deployment Matrix
- **Frontend**: Vercel (Auto-deployed via GitHub).
- **Agent**: Node.js/PM2 (Railway or VPS).
- **Database**: Supabase (Cloud).
