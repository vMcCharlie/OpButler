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
- **Proactive Mitigation**: Sends instant Telegram alerts with specific instructions (e.g., *"Repay 2.5 BNB"*) to prevent liquidation before it happens.

---

## 🚀 Key Features

<table align="center">
  <tr>
    <td align="center" width="33%">
      <b>Yield Dashboard</b><br>
      <img src="./src/frontend/screenshots/portfolio.png" width="100%" alt="Dashboard"><br>
      <sub>Unified View: Manage Venus, Kinza, and Radiant.</sub>
    </td>
    <td align="center" width="33%">
      <b>AI Risk Agent</b><br>
      <img src="./src/telegrambot/screenshots/analyze.png" width="100%" alt="Telegram Bot"><br>
      <sub>24/7 Guardian: Real-time status & risk alerts.</sub>
    </td>
    <td align="center" width="33%">
      <b>Strategy Simulator</b><br>
      <img src="./src/frontend/screenshots/strategy-builder.png" width="100%" alt="Simulator"><br>
      <sub>Risk Architect: Model loops before execution.</sub>
    </td>
  </tr>
</table>

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
  telegrambot/         ← AI Agent Logic & Backend
  supabase/            ← Consolidated Database Migrations
```

## 🛠️ Reproduction Quick Start

### 1. Database Setup
See **[Database Setup Guide](./src/supabase/README.md)**. Run the consolidated SQL migrations in your Supabase project.

### 2. AI Agent Secret Configuration
Configure `.env` in `src/telegrambot` (see **[Bot Guide](./src/telegrambot/README.md)**):
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