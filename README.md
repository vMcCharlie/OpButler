# OpButler - DeFi Automation & Risk Management for Venus Protocol (BSC)

**OpButler** is a comprehensive DeFi assistant designed to help users manage leverage, assess risk, and automate lending strategies on the Venus Protocol (BNB Chain). It consists of a modern web dashboard and a Telegram bot for on-the-go management.

## 🌟 Features

*   **Strategy Builder (Web):** Visual interface to simulate "Looping" (Leveraged Supply) strategies.
    *   **Real-time Risk Monitor:** Dynamic Health Factor tracking with "Long" (Price Drop) and "Short" (Price Rise) liquidation warnings.
    *   **USD-Based Calculations:** Accurate borrowing power estimations based on real-time token prices.
    *   **Cross-Asset Support:** Simulate borrowing volatile assets (e.g., BTCB) against stablecoins (e.g., FDUSD).
*   **Telegram Bot:** Automate strategy execution and monitoring directly from Telegram.
    *   Balance checking.
    *   One-click execution of pre-defined strategies (Safe/Degen Loops).
*   **Smart Interactions:** Direct integration with Venus Protocol contracts (Comptroller, vTokens) and PancakeSwap (for swaps).

---

## 🏗 Project Structure

*   **`frontend/`**: Next.js 14 Web Application (React, TailwindCSS, RainbowKit, Wagmi).
*   **`contracts/`**: Hardhat project for any custom adapter contracts (if needed).
*   **`bot.ts`**: Telegram Bot logic using `grammy` framework.
*   **`index.ts`**: Core Strategy Engine (Business Logic for simulations & execution) using `viem`.

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher)
*   **NPM** or **Yarn**
*   **Metamask** (or any Web3 Wallet)
*   **BSC RPC URL** (Private RPC recommended for reliability)
*   **Telegram Bot Token** (for Bot usage)

### 1. Installation

Clone the repository and install dependencies for both the root (Bot/Backend) and the Frontend.

```bash
# 1. Install Root Dependencies (Bot & Core Logic)
npm install

# 2. Install Frontend Dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Configuration

This project has two deployable parts with separate environment variables:

#### 📦 Root (`.env`) - For Telegram Bot (Railway)

Create a `.env` file in the **root directory**. See `.env.example` for all options.

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Wallet private key (for reading blockchain state) | ✅ |
| `RPC_URL` | BSC RPC endpoint | ✅ |
| `TELEGRAM_BOT_TOKEN` | Get from @BotFather | ✅ |
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_KEY` | Supabase `service_role` key | ✅ |
| `ALLOWED_USER_ID` | Admin Telegram ID (optional) | ❌ |

#### 🌐 Frontend (`frontend/.env`) - For Web Dashboard (Vercel)

Create a `.env` file in the **frontend directory**. See `frontend/.env.example` for all options.

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Get from [WalletConnect Cloud](https://cloud.walletconnect.com/) | ✅ |
| `NEXT_PUBLIC_RPC_URL` | Custom RPC (optional) | ❌ |

> **⚠️ Security Warning:** Never commit your `.env` files or Private Keys to version control! The `.gitignore` is already configured to exclude them.

---

## 🏃‍♂️ Usage

### Running the Web Dashboard (Frontend)

The frontend provides the visual Strategy Builder and Risk Monitor.

```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Telegram Bot

The bot allows you to interact with OpButler logic via chat.

```bash
# Run locally
npm run dev
```

### 🚄 Deploying Bot to Railway (with Supabase)

To run this bot 24/7 on Railway with a persistent database:

#### 1. Set up Supabase Database
1.  Sign up at [Supabase.com](https://supabase.com/) and create a new project.
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Copy and paste the contents of `supabase_schema.sql` from this repo into the editor and run it. This creates the `users` table.
4.  Go to **Project Settings > API**.
5.  Copy the `Project URL` and `service_role` secret (or `anon` public key, though service_role is easier for backend bots).

#### 2. Deploy to Railway
1.  **Fork/Clone** this repo to your GitHub.
2.  Login to [Railway.app](https://railway.app/).
3.  Create a **New Project** > **Deploy from GitHub repo**.
4.  Select your `OpButler` repo.
5.  **Variables:** Add the following Environment Variables in Railway:
    *   `TELEGRAM_BOT_TOKEN`
    *   `PRIVATE_KEY`
    *   `RPC_URL` (Use a public BSC RPC if needed: `https://bsc-dataseed.binance.org/`)
    *   `SUPABASE_URL`: Your Supabase Project URL.
    *   `SUPABASE_KEY`: Your Supabase `service_role` key (or `anon` key if RLS allows).
6.  **Root Directory:** Set the Root Directory to `/` (default).
7.  **Build Command:** `npm run build` (This runs `tsc` to compile TypeScript).
8.  **Start Command:** `npm run start` (This runs `node dist/bot.js`).

Railway will automatically detect the `package.json` in the root and start the bot.

**Bot Commands:**
*   `/start` - Initialize and get instructions.
*   `/verify <signature>` - Link your wallet to receive alerts.
*   `/risk` - Check your current Health Factor.
*   `/status` - See your linked wallet and settings.

### 🚀 Deploying Frontend to Vercel

To deploy the web dashboard to Vercel:

1.  **Fork/Clone** this repo to your GitHub.
2.  Login to [Vercel.com](https://vercel.com/).
3.  Click **Add New** > **Project** > **Import from GitHub**.
4.  Select your `OpButler` repo.
5.  **Root Directory:** Set to `frontend`.
6.  **Framework Preset:** Next.js (auto-detected).
7.  **Environment Variables:** Add:
    *   `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect Project ID.
8.  Click **Deploy**!

Vercel will automatically build and deploy your Next.js frontend.

---

## 🛠️ Configuration & APIs

### Supported Assets (Venus Protocol)
The application is pre-configured with Venus Protocol contract addresses on **BNB Chain Mainnet**.

*   **Comptroller:** `0xfD36E2c2a6789Db23113685031d7F16329158384`
*   **Router (PancakeSwap):** `0x13f4EA83D0bd40E75C8222255bc855a974568Dd4`

### Modifying Assets
To add or remove supported assets, check `frontend/lib/constants.ts` (or equivalent) and ensuring the `strategies.json` logic in `index.ts` handles the new token addresses.

### Price Feeds
*   **Frontend:** Uses Binance Public API for real-time price data in the Strategy Builder.
*   **Contracts:** Uses On-Chain Oracles (Venus Oracle) for execution safety.

---

## 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
