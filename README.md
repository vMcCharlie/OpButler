# OpButler - DeFi Strategy Agent (OpenClaw Edition)

## Project Overview
OpButler is an intelligent DeFi agent designed to automate complex strategies on the BNB Chain using Venus Protocol and PancakeSwap. It features a robust "Strategy Engine" that simulates execution outcomes before committing funds, ensuring safety and profitability.

## Features
- **The Looper**: Automates leveraging long positions (Supply -> Borrow -> Swap -> Supply).
- **The Unwinder**: Automates safe exit strategies (Withdraw -> Swap -> Repay).
- **Simulation Protection**: Prevents execution if projected Health Factor is low or APY is negative.
- **Telegram Interface**: Interact with the agent directly via Telegram.
- **Docker Support**: Easy deployment with one command.

## Telegram Bot Setup (Easy Mode)
To let users interact with OpButler via Telegram:

1.  **Get a Bot Token**:
    - Open Telegram and search for **@BotFather**.
    - Send `/newbot` and follow instructions.
    - Copy the HTTP API Token.

2.  **Configure `.env`**:
    Add the token to your `.env` file:
    ```env
    PRIVATE_KEY=your_private_key_without_0x
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
    ALLOWED_USER_ID=your_telegram_user_id
    ```
    *Note: Get your user ID by messaging @userinfobot on Telegram.*

3.  **Run with Docker**:
    Ensure Docker Desktop is running, then execute:
    ```bash
    docker-compose up -d --build
    ```

4.  **Interact**:
    Open your bot in Telegram and send `/start`.
    - `/long <asset> <amount> <leverage>`
    - `/history`
    - `/unwind <id>`

## Manual Setup (Developers)

### Prerequisites
- Node.js (v18+)
- A BNB Chain RPC URL

### Installation
```bash
npm install
npx tsc
node dist/index.js # For CLI mode
node dist/bot.js   # For Bot mode
```

## Web Interface (Frontend)
OpButler now includes a comprehensive Next.js web interface for managing your DeFi strategies visually.

### Features
- **Dashboard**: Real-time health monitoring of your positions across **Venus**, **Kinza**, and **Radiant**.
- **Strategy Management**: 
    - **Loop Builder**: Visually supply collateral and borrow assets to loop yields with leverage (up to 4x).
    - **The Unwinder**: One-click panic exit to repay debts and withdraw collateral safely.
- **Portfolio**: Aggregated net worth tracking, protocol allocation charts, and detailed asset breakdowns.

### Running the Frontend
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Technology Stack
- **Frontend**: Next.js 14, TailwindCSS, RainbowKit, Wagmi, Recharts.
- **Blockchain**: BNB Smart Chain (BSC) Mainnet.
- **Integrations**: Venus Protocol, Kinza Finance, Radiant V2.

## Hackathon Submission Details

### Onchain Proof & Verification
To verify the agent's work for hackathon judging:
1.  **Reproduce**: Clone repo, setup `.env`, run with Docker or locally.
2.  **Execute**: Connect your wallet to the frontend and execute a strategy (e.g., Supply BNB, Borrow USDT).
3.  **Verify**: The interface will update with your new position. Check your address on BscScan.

### OpenClaw Integration
OpButler exports skills in `skills.ts`. You can import `TheLooper` and `TheUnwinder` into any OpenClaw agent configuration to give it these DeFi capabilities.

## Disclaimer
This software is experimental. Use at your own risk. Always test with small amounts first.
