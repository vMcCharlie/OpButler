# OpButler - AI-Powered DeFi Portfolio Manager

**OpButler** is an intelligent AI agent designed to optimize your DeFi portfolio on the BNB Chain. It monitors your positions, automates risk management, and helps you architect complex strategies to maximize your yield while keeping you safe from liquidations.

## 🚀 Key Features

-   **AI Agent Monitoring**: Real-time health checks and risk analysis via a Telegram Bot.
-   **Strategy Architect**: Simulate and build loop strategies for Venus, Kinza, and Radiant protocols.
-   **Automated Safety**: "Never Get Liquidated" loop monitoring and proactive health alerts.
-   **Seamless Interface**: A modern, responsive dashboard to manage your assets and view performance.

## 📂 Repository Structure

This repository is organized as follows:

-   [`src/`](./src/): Contains all source code.
    -   [`src/frontend/`](./src/frontend/): The Next.js web application.
    -   [`src/telegrambot/`](./src/telegrambot/): The Telegram bot logic and backend scripts.
-   [`docs/`](./docs/): Detailed project documentation.
    -   [`PROJECT.md`](./docs/PROJECT.md): Project overview, problem statement, and solution.
    -   [`TECHNICAL.md`](./docs/TECHNICAL.md): Architecture, setup guide, and technical details.
    -   [`EXTRAS.md`](./docs/EXTRAS.md): Additional resources and demo links.

## 🛠️ Quick Start

To get started with OpButler, please refer to the [Technical Guide](./docs/TECHNICAL.md) for detailed setup instructions for both the Frontend and the Telegram Bot.

### Demo Instructions

1.  **Connect Wallet**: On the frontend, link your browser wallet (e.g., MetaMask).
2.  **View Dashboard**: See your aggregated net worth and positions.
3.  **Simulate Strategy**: Go to "Top Strategies", select a loop, and simulate yield/risk.
4.  **Telegram Alert**:
    -   Start the bot.
    -   Link wallet via `/start`.
    -   Get proactive "Health Reports" from the AI Risk Guard.

### Prerequisites
-   Node.js (v18+)
-   Supabase Account
-   Telegram Bot Token

## 📄 License

[MIT](./LICENSE)