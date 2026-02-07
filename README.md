# OpButler - DeFi Strategy Agent (OpenClaw Edition)

## Project Overview
OpButler is an intelligent DeFi agent designed to automate complex strategies on the BNB Chain using Venus Protocol and PancakeSwap. It features a robust "Strategy Engine" that simulates execution outcomes before committing funds, ensuring safety and profitability.

## Architecture
- **Strategy Engine (`index.ts`)**: The core logic handling simulation, execution, and state management.
- **Agent Skills (`skills.ts`)**: Modular skills ("The Looper", "The Unwinder") designed for integration with the OpenClaw framework.
- **Safety First (`SOUL.md`)**: The agent's prime directive is to **always simulate** and respect Health Factor limits (> 1.5).

## Features
- **The Looper**: Automates leveraging long positions (Supply -> Borrow -> Swap -> Supply).
- **The Unwinder**: Automates safe exit strategies (Withdraw -> Swap -> Repay).
- **Simulation Protection**: Prevents execution if projected Health Factor is low or APY is negative.
- **State Persistence**: Tracks active strategies in `strategies.json`.

## Setup & Reproducibility (Hackathon Submission)

### Prerequisites
- Node.js (v18+)
- A BNB Chain RPC URL (Public or Private)
- A Wallet Private Key with BNB (for gas) and Assets (for strategies)

### 1. Installation
Clone the repo and install dependencies:
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_without_0x
# Optional: RPC URL if not using default viem public RPC
# RPC_URL=https://bsc-dataseed.binance.org/
```

### 3. Build
Compile the TypeScript code:
```bash
npx tsc
```

### 4. Running the Agent
To run the Strategy Engine directly (standalone mode):
```bash
node dist/index.js
```
*Note: You may need to uncomment the usage examples in `index.ts` to execute a specific strategy immediately.*

## OpenClaw Integration
OpButler is designed to be plugged into the OpenClaw agent framework.

1.  **Skills Import**: The `skills.ts` file exports `TheLooper` and `TheUnwinder`.
2.  **Configuration**: Load these skills into your OpenClaw agent configuration.
3.  **Prompting**: The agent will recognize `executeLongStrategy` and `unwindStrategy` tools.

**Example Agent Prompt:**
> "OpButler, check the simulation for looping BNB on Venus with 2x leverage. If the Health Factor is above 1.5, execute the strategy."

## Onchain Proof & Verification
To verify the agent's work for hackathon judging:
1.  **Reproduce**: Follow the setup steps above.
2.  **Execute**: Run a small verify transaction (e.g. supply minimal BNB).
3.  **Verify**: Check the transaction hash printed in the console on BscScan.

## Disclaimer
This software is experimental. Use at your own risk. Always test with small amounts first.
