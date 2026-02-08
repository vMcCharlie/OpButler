# OpButler - Multi-Protocol DeFi Risk Management (BNB Chain)

**OpButler** is a comprehensive DeFi risk management and strategy automation platform for BNB Chain. It aggregates positions across **Venus Protocol**, **Kinza Finance**, and **Radiant V2**, providing a unified dashboard, real-time risk alerts via Telegram, and on-chain execution through smart contracts.

## 🌟 Features

### 📊 Unified Dashboard
- **Multi-Protocol Aggregation:** View your Net Worth, Total Supplied, and Total Borrowed across Venus, Kinza, and Radiant in one place.
- **Per-Protocol Health:** Monitor Available Credit, Debt Risk, and Health Score for each lending protocol.
- **Real-time Updates:** Positions refresh automatically every 10 seconds.

### ⚙️ Strategy Builder
- **Looping Strategies:** Simulate leveraged supply positions with visual risk analysis.
- **Cross-Asset Support:** Borrow volatile assets (BTCB, ETH) against stablecoins (USDT, FDUSD).
- **USD-Based Calculations:** Accurate borrow power based on real-time prices.
- **Risk Warnings:** Dynamic liquidation price alerts for both Long and Short scenarios.

### 🔔 Telegram Alerts (Read-Only)
- **Liquidation Warnings:** Receive alerts when your Health Factor drops below your threshold.
- **Actionable Suggestions:** Each alert includes how much to repay or add as collateral to reach a safe HF.
- **Links to Dashboard:** Alerts include a link to the OpButler website where you can execute transactions securely.
- **No Execution via Bot:** All sensitive operations happen through the web dashboard via smart contracts—never through Telegram.

### 🔐 Smart Contract Execution
- **OpButlerWallet:** User-owned smart contract wallet for executing strategies.
- **OpButlerVault:** Aggregated vault for yield optimization.
- **OpButlerFactory:** Factory contract for deploying user wallets.
- **On-Chain Safety:** All transactions are signed and executed by the user through the web interface.

---

## 🏗 Project Structure

```
OpButler/
├── frontend/               # Next.js 15 Web Application
│   ├── app/                # App Router pages
│   ├── components/         # React components (Dashboard, StrategyBuilder, Settings)
│   ├── hooks/              # Custom hooks (useAggregatedHealth, useTokenPrices)
│   └── contracts/          # Contract ABIs for frontend
├── contracts/              # Solidity Smart Contracts (Hardhat)
│   ├── OpButlerWallet.sol  # User wallet for strategy execution
│   ├── OpButlerVault.sol   # Yield aggregation vault
│   └── OpButlerFactory.sol # Factory for wallet deployment
├── bot.ts                  # Telegram Bot (Alerts Only)
├── index.ts                # Core Strategy Engine (viem)
└── supabase_schema.sql     # Database schema for user settings
```

---

## 🔗 Supported Protocols

| Protocol | Type | Address |
|----------|------|---------|
| **Venus Protocol** | Compound V2 Fork | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| **Kinza Finance** | Compound V2 Fork | `0xcB0620b181140e57D1C0D8b724cde623cA963c8C` |
| **Radiant V2** | Aave V2 Fork | `0xd50Cf00b6e600Dd036Ba8eF475677d816d6c4281` |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Metamask** or any Web3 wallet
- **Telegram Bot Token** (from @BotFather)
- **Supabase Account** (for user data storage)
- **WalletConnect Project ID** (for frontend wallet connections)

### 1. Installation

```bash
# Root dependencies (Bot & Core Logic)
npm install

# Frontend dependencies
cd frontend
npm install
```

### 2. Environment Configuration

#### 📦 Root (`.env`) - Telegram Bot (Deploy to Railway)

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Read-only wallet key (for querying blockchain) | ✅ |
| `RPC_URL` | BSC RPC endpoint | ✅ |
| `TELEGRAM_BOT_TOKEN` | From @BotFather | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_KEY` | Supabase service_role key | ✅ |

#### 🌐 Frontend (`frontend/.env`) - Web Dashboard (Deploy to Vercel)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From [WalletConnect Cloud](https://cloud.walletconnect.com/) | ✅ |

> ⚠️ **Security:** Never commit `.env` files. They are already in `.gitignore`.

---

## 🏃‍♂️ Usage

### Running the Frontend

```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Running the Telegram Bot (Locally)

```bash
npm run dev
```

---

## 🚄 Deployment

### Telegram Bot → Railway

1. Set up **Supabase**: Run `supabase_schema.sql` in the SQL Editor.
2. Deploy to **Railway**:
   - Root directory: `/`
   - Build: `npm run build`
   - Start: `npm run start`
   - Add all environment variables from the table above.

**Bot Commands:**
| Command | Description |
|---------|-------------|
| `/start` | Get setup instructions |
| `/verify <signature>` | Link your wallet (sign message on website first) |
| `/risk` | Check your Health Factor with suggestions |
| `/status` | View linked wallet info |

### Frontend → Vercel

1. Import repo to Vercel
2. Set root directory to `frontend`
3. Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
4. Deploy!

---

## 🔐 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User connects wallet on OpButler Website                    │
│                           ↓                                     │
│  2. Dashboard shows positions across Venus, Kinza, Radiant      │
│                           ↓                                     │
│  3. User links Telegram via Settings (signature verification)   │
│                           ↓                                     │
│  4. Bot monitors Health Factor every 5 minutes                  │
│                           ↓                                     │
│  5. If HF < threshold → Bot sends alert with:                   │
│     • Current HF & Position Summary                             │
│     • Suggestions (Repay $X OR Add $Y collateral)               │
│     • Link to OpButler dashboard                                │
│                           ↓                                     │
│  6. User clicks link → Opens website → Executes via wallet      │
│     (All transactions signed by user, executed via contracts)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Security Points:**
- Telegram bot is **read-only** (alerts only, no execution)
- All transactions require **wallet signature** on the website
- Smart contracts handle execution with proper access control

---

## 🛠️ Technical Details

### Price Feeds
- **Frontend:** Binance Public API for real-time prices
- **Contracts:** On-chain oracles (Venus Oracle, Chainlink)

### Health Factor Calculation
```
HF = (Total Collateral × Collateral Factor) / Total Debt
```

### Alert Suggestions
When HF drops below threshold, the bot calculates:
- **Option A:** Amount of debt to repay to reach HF 1.5
- **Option B:** Amount of collateral to add to reach HF 1.5

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see `LICENSE` for details.
