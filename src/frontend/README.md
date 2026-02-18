# OpButler Frontend

This is the Next.js web dashboard for **OpButler**, your Personal DeFi Concierge.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1.  Navigate to the frontend directory:
    ```bash
    cd src/frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup**:
    Copy the example environment file:
    ```bash
    cp .env.example .env.local
    ```
    
    You need to fill in the following variables in `.env.local`:
    - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Get a free Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).
    - `NEXT_PUBLIC_BSC_RPC_URL`: (Optional) Custom RPC URL for Binance Smart Chain.

### Running Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## 🏗️ Build for Production

To create an optimized production build:

```bash
npm run build
npm start
```

## 🧩 Key Components

-   `app/page.tsx`: The main landing page with "Good Vibes" marketing.
-   `app/dashboard/`: The authenticated user dashboard.
-   `components/RiskMonitor.tsx`: Displays real-time Health Factor.
-   `components/TopLoops.tsx`: Interface for "Smart Loop" strategies.

## 🎨 Styling

We use **Tailwind CSS** and **shadcn/ui** for a premium, responsive feel.
-   Dark Mode by default.
-   Gradients: `#CEFF00` (Lime) and `Emerald-400`.
