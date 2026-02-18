# OpButler - Your Personal DeFi Concierge

> **OpButler is the easiest way to manage and grow your DeFi money on Binance from one simple dashboard. Our AI watches your back 24/7, keeping you safe from market risks so you can earn more with less stress.**

![Dashboard Screenshot](./screenshots/dashboard_preview.png)
*(Place your dashboard screenshot here)*

## 🏆 Hackathon Track: DeFi (Good Vibes Only)
OpButler is built for the **DeFi Track**, focusing on:
- **Practical Utility**: A unified dashboard for Venus, Kinza, and Radiant.
- **Risk Monitoring**: An autonomous "AI Risk Agent" that watches your Health Factor so you don't have to.
- **Liquidation Prevention**: Instant Telegram alerts and "Panic Exit" buttons to save your funds.

## 🚀 Key Features

### 1. Unified Dashboard
Manage your entire BNB Chain lending portfolio in one place. No more switching tabs between **Venus, Kinza, and Radiant**. View your aggregated Net Worth, Total APY, and Health Factor at a glance.

### 2. AI Risk Agent (Gemini Powered)
Powered by **Google Gemini**, our Telegram Bot acts as your personal risk consultant.
- **24/7 Monitoring**: Watches your Health Factor in the background.
- **Smart Insights**: Analyzes your positions and gives natural-language advice (e.g., *"Repay 5 BNB on Venus to increase HF to 1.2"*).
- **Instant Alerts**: Get notified immediately via Telegram if you are at risk of liquidation.

### 3. Stress-Free "Good Vibes"
We stripped away the complexity.
- **One-Click Actions**: Easily supply, borrow, or repay.
- **Visual Health Indicators**: Simple "Safe/Warning/Danger" status for every protocol.
- **Strategy Simulator**: Test your "Looping" strategies before committing real funds.

## 📸 Screenshots

| Dashboard | Mobile View |
| :---: | :---: |
| ![Dashboard](./screenshots/dashboard.png) | ![Mobile](./screenshots/mobile.png) |

| AI Agent | Strategy Simulator |
| :---: | :---: |
| ![Telegram Bot](./screenshots/telegram.png) | ![Strategy](./screenshots/strategy.png) |

*(Note: Please upload screenshots to a `screenshots/` folder in this repository)*

## 📂 Documentation

- **[Project Overview](./docs/PROJECT.md)**: The problem, solution, and roadmap.
- **[Technical Architecture](./docs/TECHNICAL.md)**: How it works and how to set it up.
- **[Database Migrations](./src/supabase/README.md)**: Supabase schema and setup instructions.
- **[Frontend Guide](./src/frontend/README.md)**: Setup instructions for the Next.js App.
- **[Telegram Bot Guide](./src/telegrambot/README.md)**: Setup instructions for the AI Agent.

## 🛠️ Quick Start

### Prerequisites
- Node.js (v18+)
- A generic EVM Wallet (MetaMask, Rabby)
- Telegram App (for the Agent)

### Installation
1.  **Clone the repo**:
    ```bash
    git clone https://github.com/yourusername/OpButler.git
    cd OpButler
    ```
2.  **Run the Frontend**:
    See [Frontend README](./src/frontend/README.md).
3.  **Run the AI Agent**:
    See [Bot README](./src/telegrambot/README.md).

## 📄 License
[MIT](./LICENSE)