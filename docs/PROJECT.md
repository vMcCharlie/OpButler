# Project Overview

## ❓ The Problem: Fragmented DeFi stress

Managing high-yield positions on BNB Chain is currently a fragmented, high-stress experience.
-   **Cognitive Load**: Users must manually monitor diverse metrics (Net APY, HF, LTV) across multiple protocols.
-   **Liquidation Latency**: Volatile market conditions can result in sudden liquidations before a user can manually react.
-   **Execution Complexity**: Advanced "Smart Loop" strategies are inaccessible to average users due to the complexity of the supply-borrow-supply cycle.

---

## 💡 The Solution: OpButler

OpButler acts as an **Agentic Portfolio Concierge**. It synthesizes cross-protocol data into a high-fidelity "God Mode" dashboard and deploys an autonomous watchdog for every user.

### Unified Dashboard

A premium interface that aggregates **Venus, Kinza, and Radiant**.

![Dashboard Preview](../src/frontend/screenshots/dashboard.png)

### AI Risk Guard (Semantic Synthesis)
Uses **Gemini 1.5 Flash** to provide natural-language risk assessments.
![AI Analysis](../src/telegrambot/screenshots/analyze.png)

### Strategy Simulator (Risk Architecture)
A sandbox for modeling "Smart Loops" to maximize APY while projecting liquidation thresholds.
![Simulator](../src/frontend/screenshots/strategy-builder.png)

---

## 🌍 Impact: democratizing "Safe" Yield
OpButler facilitates deeper liquidity on BNB Chain by removing the "Bad Vibes" of manual risk management. We transform DeFi into a set-and-forget experience for the retail user.

---

## 🗺️ Roadmap: The Path to Autonomy

### Phase 1: HITL (Human-in-the-Loop) Governance [CURRENT]
- **Status**: Production-ready.
- **Mechanism**: AI decision support. The agent monitors the chain and suggests remedial actions. Execution requires user confirmation (HITL) on-chain to ensure governance integrity.

### Phase 2: Autonomous On-chain Decision Synthesis
- **Goal**: Full Agentic Autonomy.
- **Mechanism**: Integrating **OpenClaw** for verifiable agent actions. Enabling the agent to execute "Panic Repay" or "Yield Migration" automatically via threshold-triggered smart contracts when risk parameters are breached.

### Phase 3: Cross-Chain Concierge Expansion
- **Goal**: Multichain Agentic Presence.
- **Mechanism**: Support for PancakeSwap Lending and Lista DAO, expanding the AI's "Context Window" to the entire BNB Ecosystem.
