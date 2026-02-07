# OpButler: The "Google Flights" of BNB Lending

## 🚀 Project Overview
**OpButler** is a trustless **DeFi Super-App** on the **BNB Chain**. It aggregates lending rates from major protocols—**Venus, Kinza, and Radiant**—into a single, powerful dashboard. It transforms complex, multi-step financial maneuvers (like Looping and Unwinding) into simple, atomic transactions.

Existing DeFi interfaces are fragmented. Users must check 4+ tabs to find the best rates. OpButler solves this by acting as an **Interface Layer** that scans the ecosystem and offers a **"Zap to Best Rate"** experience.

---

## 💡 The Problem
- **Fragmentation**: Users have to manually check Venus, Kinza, Radiant, and Alpaca to find the best lending APY.
- **Complexity**: Strategies like "Looping" (Leveraged Long) require 5+ manual transactions (Supply -> Borrow -> Swap -> Supply).
- **Risk**: Manual execution leads to errors. A simple mistake in LTV calculation causes instant liquidation.

## 🛠 The Solution
OpButler is a **Non-Custodial dApp** that abstracts this complexity.

### Key Features
1.  **📊 The Aggregator Dashboard**:
    - instantly compares APYs across Venus, Kinza, and Radiant.
    - Highlights the **Best Supply Rate** (Green) and **Lowest Borrow Rate** (Gold).
    - **"Zap to Best Rate"**: One-click deposit into the highest yielding protocol.

2.  **🔄 "The Looper" (Automated Strategy Engine)**:
    - **One-Click Execution**: Users sign *one* transaction to execute a full leverage loop.
    - **Atomic Smart Contract**: Our `OpButlerWallet` proxy handles the sequence (Supply -> Borrow -> Swap -> Supply) safely in a single block.

3.  **🛡️ Smart Health Monitor**:
    - **Simulation-First**: The UI simulates the strategy before execution.
    - **Break-Even Analysis**: A built-in calculator shows exactly when the strategy becomes profitable, factoring in gas and swap fees.

4.  **↩️ "The Unwinder"**:
    - One-click exit from complex leveraged positions. No more manual deleveraging loops.

---

## 🏗 Technical Architecture
- **Smart Contracts**: 
    - `OpButlerByactory`: Deploys a unique **Smart Wallet Proxy** for each user (Clones EIP-1167).
    - `OpButlerWallet`: The user's personal execution engine. It holds positions and interacts with Protocol Adapters.
    - **Adapters**: Modular contracts connecting to Venus (`IVenus`), Kinza, and Radiant.
- **Frontend**: 
    - **Next.js 14** (App Router) for speed and SEO.
    - **Wagmi / Viem**: Robust blockchain interaction.
    - **RainbowKit**: Seamless wallet connection.
    - **DefiLlama API**: Real-time APY data fetching for the comparison engine.
    - **Tailwind CSS + Shadcn/ui**: A premium, "Binance Yellow" dark-themed UI.

## 🏆 Hackathon Track Alignment
- **DeFi Track**: OpButler is a pure DeFi primitive aggregator. It drives volume to BNB Chain's top lending protocols by making them easier to use.
- **User Experience**: We turn a 15-minute manual process into a 10-second "One Click" experience.

## 👣 Roadmap
1.  **Refinancing**: "Migrate Position" button to move a loan from Venus to Kinza instantly if rates change.
2.  **Flashloans**: Utilize PancakeSwap Flashswaps for capital-efficient unwinding of max-leverage positions.
3.  **Mobile App**: Native mobile interface for managing positions on the go.

---

### 🔗 Links
- **GitHub Repo**: [https://github.com/mccharliesins/OpButler](https://github.com/mccharliesins/OpButler)
- **X (Twitter)**: [https://x.com/OpButlerBNB](https://x.com/OpButlerBNB)
- **Live Demo**: [Insert Vercel Link if deployed]
