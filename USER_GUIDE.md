# 🤖 OpButler User Guide

Welcome to your new DeFi Command Center. Here is how to operate the OpButler dApp.

## 1. Connect Your Wallet
*   Click the **Connect Wallet** button in the top right.
*   Select **MetaMask**, **Trust Wallet**, or use **WalletConnect**.
*   Ensure you are on **BNB Smart Chain** (Mainnet or Testnet).

## 2. Browse Opportunities
*   The **Market Opportunities** table on the dashboard scans real-time lending rates from **Venus**, **Kinza**, and **Radiant**.
*   Look for the highest **Supply APY** combined with safe borrowing costs.
*   *Strategy*: Ideally, find an asset where (Supply APY + Leveraged Rewards) > Borrow APY.

## 3. Activate Your Smart Engine
*   Before you can execute advanced strategies, you need a dedicated **Smart Wallet**.
*   Go to the **Strategy Builder** widget (bottom right).
*   Click **"Create Smart Account"**.
*   Confirm the transaction in your wallet.
    *   *What this does:* Deploys a unique proxy contract (clone) that only *you* control. this contract will secure your funds and execute the loops.

## 4. Configure & Simulate
*   Once your Smart Account is live, the Strategy Builder unlocks.
*   **Asset**: Select `USDT` (Stable) or `BNB` (Long).
*   **Amount**: Enter how much collateral you want to supply.
*   **Leverage**: 
    *   **1.0x**: Simple lending (Safe).
    *   **1.5x - 2.0x**: Moderate Looping.
    *   **3.0x**: Degen Mode (High Risk).
*   **Simulate**: Watch the **Health Factor Gauge** and **Net APY** update in real-time.
    *   *Green Zone (Health > 1.5)*: Safe.
    *   *Yellow Zone (1.1 - 1.5)*: Caution.
    *   *Red Zone (< 1.1)*: Liquidation Risk!

## 5. Execute The Loop
*   Click **"Execute Loop"**.
*   **Approval**: First, approve your Smart Wallet to spend your `USDT`/`BNB`.
*   **Execution**: The second transaction triggers the loop.
    1.  Supplies your funds to Venus.
    2.  Borrows more against them.
    3.  Re-supplies the borrowed funds.
    4.  Repeats until target leverage is hit.
*   *Note*: This requires the `VenusAdapter` smart contract to be deployed on the backend.

## 6. Monitor Portfolio
*   The **Dashboard** now tracks your **Risk Level** in real-time.
*   **Liquidity**: Shows how much "buffer" you have in USD.
*   **Health Factor**: If this drops near 1.0, you need to add collateral or unwind.
*   **AT RISK**: If you see this red warning, take action immediately to avoid liquidation!

## 7. Unwind (Exit Strategy)
*   (Coming Soon) The "Unwind" button will reverse the loop, repaying the loan and returning your original collateral + profits to your wallet.
