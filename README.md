# OpButler - Your Personal DeFi Concierge

> **The easiest way to manage and grow your DeFi positions on BNB Chain from one unified interface. Powered by Gemini, watching your back 24/7.**

[![Live on BSC](https://img.shields.io/badge/Live%20on-BSC-F3BA2F?style=for-the-badge&logo=binance)](https://opbutler.xyz)
[![AI Agent](https://img.shields.io/badge/AI%20Agent-Watchdog-brightgreen?style=for-the-badge&logo=telegram)](https://t.me/OpButlerBot)

![Hero Preview](./src/frontend/screenshots/homepage.png)

## 🏆 DeFi Track: Practical Utility
OpButler is a high-yield management concierge built for the **"Good Vibes Only"** hackathon. It addresses the core stressors of DeFi—fragmentation, complexity, and liquidation risk—by providing a unified, agent-monitored dashboard.

### 🤖 Agentic Blockchain 24/7 Watch
Our core differentiator is the **Autonomous AI Risk Agent**. 
- **Continuous Monitoring**: Scans user positions across Venus, Kinza, and Radiant every block.
- **Gemini-Powered Synthesis**: Translates complex on-chain metrics into actionable, natural-language risk assessments.
- **Proactive Mitigation**: Sends instant Telegram alerts with specific instructions (e.g., *"Repay 2.5 BNB"*) and executes automated "Smart Loops" on-chain when authorized.

---

## 🚀 Key Features

### 📊 Yield Dashboard
**Unified Portfolio Management**
Manage your positions across Venus, Kinza, and Radiant from a single, high-fidelity interface. Monitor Net Worth, Net APY, and Health Factors in real-time.

![Dashboard Preview](./src/frontend/screenshots/dashboard.png)

### 🤖 AI Risk Agent
**24/7 Agentic Guardian**
Our Gemini-powered watchdog synthesizes on-chain metrics into natural language risk audits. Get instant Telegram alerts for liquidation risks and proactive strategy suggestions.

![AI Risk Agent](./src/telegramagent/screenshots/alert.png)

### ⚡ Strategy Executor (Smart Loops)
**Risk-Aware Architect**
Model complex "Smart Loop" strategies and **execute them on-chain** via our verified `OpLoopVault` contract on BSC.

![Strategy Executor](./src/frontend/screenshots/strategy-builder.png)

### 🔗 Smart Contracts
**Verified Execution Layer**
Trustless, atomic execution of leverage and deleverage loops.
- **Contract**: `OpLoopVaultV3`
- **Address**: [`0x0C0D77F03d98Be4e4E1FA7be0591ec3bEcF14f03`](https://bscscan.com/address/0x0C0D77F03d98Be4e4E1FA7be0591ec3bEcF14f03)

---

## 🔄 Sample Flow: The "Smart Loop"

1.  **User Action**: Selects "Long BNB" strategy on the Dashboard.
2.  **Simulation**: Frontend projects APY and Liquidation Price.
3.  **Execution**: User signs a transaction to the `OpLoopVault` contract.
4.  **On-Chain Magic**:
    - Contract accepts User's BNB.
    - Flash swaps additional BNB from PancakeSwap (Leverage).
    - Supplies total to Venus.
    - Borrows USDT.
    - Swaps USDT for BNB to repay the flash loan.
5.  **Result**: User holds a leveraged supply position, earning compounded yields, all in one transaction.

---

## 📂 Repository Layout

```text
/README.md             ← Concierge Overview & Quick Start
/docs/
  PROJECT.md           ← Problem, Solution, HITL-to-Autonomous Roadmap
  TECHNICAL.md         ← Architecture, Setup, Verification Guide
  EXTRAS.md            ← Presentation Slides & Demo Video
/src/
  frontend/            ← Next.js Web Dashboard
  telegramagent/       ← AI Agent Logic & Backend
  contracts/           ← Solidity Smart Contracts (OpLoopVault)
  supabase/            ← Consolidated Database Migrations
```

## 🛠️ Reproduction Quick Start

### 1. Database Setup
See **[Database Setup Guide](./src/supabase/README.md)**. Run the consolidated SQL migrations in your Supabase project.

### 2. AI Agent Secret Configuration
Configure `.env` in `src/telegramagent` (see **[Bot Guide](./src/telegramagent/README.md)**):
```env
TELEGRAM_BOT_TOKEN=...
GEMINI_API_KEY=...
SUPABASE_URL=...
```

### 3. Frontend Launch
Configure `.env.local` in `src/frontend` (see **[Frontend Guide](./src/frontend/README.md)**):
```bash
cd src/frontend
npm install
npm run dev
```

---

## 📈 Impact & Vision
OpButler simplifies the "Bad Vibes" of DeFi (stress and fragmentation) into a "Good Vibes" concierge experience. By leveraging LLM-driven analysis, we provide the safety net required for the next wave of liquidity participants on BNB Chain.

[MIT](./LICENSE)