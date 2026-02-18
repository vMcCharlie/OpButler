# OpButler Frontend Interface

The "Concierge" interface is built for speed, clarity, and "Good Vibes".

## ✨ Feature Gallery

### 1. Unified Portfolio
Aggregates your Net Worth and Health Factor across all integrated protocols (Venus, Kinza, Radiant).
![Portfolio](../screenshots/portfolio.png)

### 2. High-Yield Lending
Simplified Supply and Borrow interfaces for maximum usability.
![Lend Earn](../screenshots/lend-earn.png)
![Lend Borrow](../screenshots/lend-borrow.png)

### 3. Strategy Simulator
Our "Smart Loop" builder allows users to project APY and simulate risk scenarios.
![Strategy Builder](../screenshots/strategy-builder.png)

---

## 🛠️ Reproduction Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` based on `.env.example`:
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/).
- `GEMINI_API_KEY`: Required for frontend AI-insight synthesis.

### 3. Development Server
```bash
npm run dev
```

## 🏗️ Tech Stack
-   **Framework**: Next.js 14
-   **Styling**: Tailwind CSS & shadcn/ui
-   **Blockchain**: Wagmi & Viem
-   **AI**: Google Gemini 1.5 Flash

---

## ✅ Complete the Setup

To fully deploy the OpButler ecosystem, ensure you have completed all three pillars:

1.  **[Current] Frontend Dashboard**: (You are here) The user interface.
2.  **[Database Schema](../supabase/README.md)**: SQL migrations for user storage.
3.  **[AI Risk Agent](../telegrambot/README.md)**: The 24/7 monitoring backend.
