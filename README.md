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

Create a `.env` file in the **root directory** with the following variables:

```env
# Blockchain
PRIVATE_KEY=0x...                  # Your Wallet Private Key (for Bot execution)
RPC_URL=https://bsc-dataseed.binance.org/

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC...   # Get from @BotFather
ALLOWED_USER_ID=123456789          # Your Telegram User ID (for security)

# APIs (Optional)
BINANCE_API_KEY=...                # For precise price feeds (if used)
```

> **⚠️ Security Warning:** Never commit your `.env` file or Private Keys to version control!

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
# Run from the root directory
npx ts-node bot.ts
```

**Bot Commands:**
*   `/start` - Open the main menu.
*   `/id` - Get your Telegram User ID (to add to `.env`).

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
