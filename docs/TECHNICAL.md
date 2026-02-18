# Technical Documentation & Setup Guide

This guide covers the architecture, setup, and deployment of the **OpButler** project.

## 🏗️ Architecture

OpButler consists of two main components working in tandem to provide a "concierge" experience:

1.  **Frontend (Next.js)**: A responsive web dashboard for users to connect their wallets, view positions, and execute simulated strategies. It communicates with the blockchain via Wagmi/Viem and sends analysis requests to our API.
2.  **AI Risk Agent (Node.js/Grammy)**: A backend service that monitors user positions on the blockchain 24/7. It uses **Google Gemini** to analyze portfolio health and generates natural language risk reports sent via Telegram.

### Tech Stack

-   **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, Wagmi/Viem.
-   **AI/Backend**: Node.js, Grammy.js (Telegram), **Google Gemini API** (Analysis), Supabase (User Data).
-   **Blockchain**: BNB Smart Chain (BSC).
-   **Protocols Integrated**: Venus, Kinza, Radiant.

## 🚀 Setup Guide

To get OpButler running locally, you need to set up both the Frontend and the Telegram Bot.

### Prerequisites
-   **Node.js** v18+
-   **Supabase Project**: For storing user preferences and chat IDs.
-   **Telegram Bot Token**: Get one from [@BotFather](https://t.me/BotFather).
-   **Google Gemini API Key**: For the AI analysis features.
-   **WalletConnect Project ID**: For the frontend wallet connection.

### Quick Start

We have detailed instructions for each component:

1.  **[Frontend Setup Guide](../src/frontend/README.md)**  
    *Go here to launch the web dashboard.*

2.  **[AI Agent Setup Guide](../src/telegrambot/README.md)**  
    *Go here to launch the Telegram bot.*

## 🧪 Demo Flow

1.  **Connect Wallet**: On the frontend, link your browser wallet.
2.  **View Dashboard**: See your aggregated net worth and positions.
3.  **Simulate Strategy**: Go to "Top Strategies", select a loop, and simulate yield.
4.  **Telegram Alert**:
    -   Start the bot.
    -   Link wallet via `/start`.
    -   Type `/analyze` to get a Gemini-powered assessment of your portfolio.

## 📦 Deployment

### Frontend
Deploy easily on **Vercel**:
1.  Import the `src/frontend` directory.
2.  Add environment variables (`NEXT_PUBLIC_...`).
3.  Deploy.

### AI Agent
Deploy on a VPS or cloud provider (Railway, Heroku):
1.  Use a process manager like `pm2`.
2.  Start command: `npm start`.
