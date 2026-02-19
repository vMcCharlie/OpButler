# OpLoop Vault V3 - On-Chain Execution

This folder contains the **OpLoopVaultV3** smart contract, which powers the "Smart Loop" strategies on the OpButler dashboard.

## 📍 Deployed Contract (BSC Mainnet)

| Contract | Address |
| :--- | :--- |
| **OpLoopVaultV3** | [`0x0C0D77F03d98Be4e4E1FA7be0591ec3bEcF14f03`](https://bscscan.com/address/0x0C0D77F03d98Be4e4E1FA7be0591ec3bEcF14f03) |

---

## ⚡ Features

1.  **Multi-Protocol Support**: Executes leverage loops on **Venus**, **Kinza**, and **Radiant**.
2.  **Flash Deleverage**: Atomically unwinds leveraged positions in a single transaction using PancakeSwap flash swaps.
3.  **User-Owned Positions**: uses credit delegation (Kinza/Radiant) so user funds remain in their own wallet, visible on the dashboard.
4.  **Input Flexibility**: Accepts any token (or native BNB) and auto-swaps to the required collateral asset.

---

## 🚀 Deployment Guide (Do It Yourself)

If you wish to deploy your own instance of the vault:

### Prerequisites
1.  **MetaMask**: Installed and configured for BSC.
2.  **BNB**: Approx 0.01 BNB for gas fees.
3.  **Remix IDE**: [remix.ethereum.org](https://remix.ethereum.org)

### Step 1: Load Code
1.  Open [Remix IDE](https://remix.ethereum.org).
2.  Create a file named `OpLoopVault.sol`.
3.  Copy and paste the code from [`OpLoopVault.sol`](./OpLoopVault.sol).

### Step 2: Compile
1.  Go to the **Solidity Compiler** tab (Left Sidebar).
2.  Set Compiler Version to `0.8.20`.
3.  Click **Compile OpLoopVault.sol**.

### Step 3: Deploy
1.  Go to the **Deploy & Run Transactions** tab.
2.  Set Environment to **Injected Provider - MetaMask**.
3.  Click **Deploy**.
4.  Confirm in MetaMask.

### Step 4: Verify
1.  Copy your new contract address.
2.  Go to [BscScan Verify](https://bscscan.com/verifyContract).
3.  Select **Solidity (Single File)** and version `0.8.20`.
4.  Paste the code and submit.

---

## ✅ Complete the Deployment

To fully deploy the OpButler ecosystem, ensure you have completed all 4 pillars:

1.  **[Current] Smart Contracts**: (You are here) The execution layer.
2.  **[Database Schema](../supabase/README.md)**: User data storage.
3.  **[AI Agent](../telegramagent/README.md)**: The autonomous risk manager.
4.  **[Frontend Dashboard](../frontend/README.md)**: The user interface.

---

## 🛠️ Interface Reference

```solidity
// Leverage (Kinza Example)
function leverageKinza(
    address inputToken,
    address supplyAsset,
    address borrowAsset,
    uint256 amount,
    uint256 flashAmount,
    uint256 borrowAmount,
    address pancakePair
) external payable;

// Deleverage (Flash Unwind)
function deleverageKinza(
    address supplyAsset,
    address borrowAsset,
    address aToken,
    uint256 repayAmount,
    uint256 withdrawAmount,
    address pancakePair
) external;
```
