# OpButler AI Risk Agent (Telegram Bot)

This is the backend service for **OpButler**. It acts as an autonomous "AI Risk Concierge" that monitors user positions on the BNB Chain 24/7.

## 🤖 Features
-   **Real-time Monitoring**: Checks Health Factors on Venus, Kinza, and Radiant.
-   **Gemini AI Integration**: Analyzes portfolio data to provide natural language risk assessments.
-   **Instant Alerts**: Sends Telegram notifications if a user is near liquidation.

## 🚀 Getting Started

### Prerequisites
-   Node.js 18+
-   A **Supabase** Project (for user database)
-   A **Telegram Bot Token** (from @BotFather)
-   **Google Gemini API Key** (for AI insights)

### Installation

1.  Navigate to the bot directory:
    ```bash
    cd src/telegrambot
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

    Fill in your `.env` file:
    ```env
    TELEGRAM_BOT_TOKEN=your_bot_token_here
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_KEY=your_supabase_service_role_key
    GEMINI_API_KEY=your_google_gemini_key
    RPC_URL=https://bsc-dataseed.binance.org/
    ```

### Database Setup

Database migrations are now located in the **[src/supabase/](../supabase/)** folder. 

Please follow the instructions in **[/src/supabase/README.md](../supabase/README.md)** to set up your project.

### Running the Bot

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

## 🛠️ Commands
-   `/start`: Link your wallet and initialize the agent.
-   `/analyze`: Request an AI-powered portfolio report.
-   `/settings`: View or change alert thresholds.
-   `/help`: See all commands.
