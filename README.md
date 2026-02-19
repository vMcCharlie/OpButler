# OpButler - Your Personal Agentic DeFi Concierge

> **The easiest way to manage and grow your DeFi positions on BNB Chain from one unified interface. Powered by Gemini, watching your back 24/7 and executing your strategies on-chain.**

[![Live on BSC](https://img.shields.io/badge/Live%20on-BSC-F3BA2F?style=for-the-badge&logo=binance)](https://opbutler.xyz)
[![AI Agent](https://img.shields.io/badge/AI%20Agent-Watchdog-brightgreen?style=for-the-badge&logo=telegram)](https://t.me/OpButlerBot)

![Hero Preview](./src/frontend/screenshots/homepage.png)

## 🤖 Agentic Blockchain 24/7 Watch
Our core differentiator is the **Autonomous AI Risk Agent**. It doesn't just "watch"-it **thinks**.
- **Perpetual Audit**: Runs a localized simulation of your portfolio every block, benchmarking it against millisecond-level market volatility.
- **Cognitive Intelligence**: Uses Gemini to decode raw hex data into high-level strategy. It understands *context*, not just numbers.
- **Agent-Initiated Action**: It goes beyond alerts. The Agent **automatically drafts the exact transaction payloads** (e.g., *"Refinance to USDT"*) needed to save your position, requiring only your final "Keymaster" signature.

## 📦 Integrated Application & Execution
OpButler is not just an agent; it is a full-stack DeFi powerhouse backed by verified smart contracts.
- **Yield Dashboards**: A "God Mode" interface aggregating Venus, Kinza, and Radiant.
- **Strategy Builder**: Architect complex loop strategies with real-time simulation.
- **Executor**: Atomic, trustless execution of strategies via the `OpLoopVault` contract.

## 🚀 Key Features

### 📊 Yield Dashboard with AI Risk Guard
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
- **Tx Hash**: [`0xb58369c356595f1b35606517ebfce456fd888fe45c23f658288eb8f09762a8b1`](https://bscscan.com/tx/0xb58369c356595f1b35606517ebfce456fd888fe45c23f658288eb8f09762a8b1)
- **Tx Hash**: [`0x6cf6613ee1c16af657e18b6ea67c84f3a002fa816c8a4b18251ab9fd0db445cf`](https://bscscan.com/tx/0x6cf6613ee1c16af657e18b6ea67c84f3a002fa816c8a4b18251ab9fd0db445cf)

---

## 📂 Repository Layout

```text
/README.md             ← Concierge Overview & Quick Start
/docs/
  PROJECT.md           ← Problem, Solution, Path to Superintelligence
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

### 2. AI Agent (The Watchdog)
Navigate to `src/telegramagent`, setup secrets, and launch.
```bash
cd src/telegramagent
cp .env.example .env  # Fill in your keys
npm install
npm start
```

### 3. Frontend Dashboard
Navigate to `src/frontend` and start the UI.
```bash
cd src/frontend
cp .env.example .env.local  # Optional: Configure custom RPCs
npm install
npm run dev
```

### 4. Smart Contract (Execution Layer)
OpButler is pre-wired to our **verified OpLoopVault** on BSC Mainnet (`0x0C0D...`).
- **Default**: No action required. Use our public execution layer.
- **Custom Deployment**: To deploy your own vault, see **[Contracts Guide](./src/contracts/README.md)** and update `src/frontend/lib/pool-config.ts`.

---

## 🔮 Vision: Path to Superintelligence

OpButler is evolving from a passive dashboard into a **Self-Driving DeFi Guard**.

### Phase 1: Agent-Initiated Autonomy [LIVE]
**The AI does the work; you hold the keys.**
The Agent monitors the chain 24/7, computing risk and drafting complex **Smart Loop** transactions. You simply act as the "Security Keymaster," signing the pre-optimized payloads.

### Phase 2: Trustless Delegated Execution [NEXT]
**Non-Custodial Automation.**
We are integrating **Session Keys** to allow the Agent to autonomously execute specific safety actions (like "Panic Repay") within user-defined bounds—no signature required.

### Phase 3: Cross-Chain Hivemind [FUTURE]
**Ecosystem-Wide Intelligence.**
Expanding the Agent's context window to orchestrate yield across PancakeSwap, Lista DAO, and beyond.