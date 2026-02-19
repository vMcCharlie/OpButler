# OpButler Smart Contract Deployment Guide (BSC)

This guide provides instructions on how to deploy the `OpLoopVault` contract to the Binance Smart Chain (BSC) to enable automated leverage loops for Venus and Kinza Finance.

## Prerequisites

1.  **MetaMask**: Installed and configured for BSC (Mainnet or Testnet).
2.  **BNB**: For gas fees on BSC.
3.  **Remix IDE**: [remix.ethereum.org](https://remix.ethereum.org)

## Deployment Steps

### 1. Load Contract in Remix
- Open [Remix IDE](https://remix.ethereum.org).
- Create a new file named `OpLoopVault.sol`.
- Paste the content of `src/contracts/OpLoopVault.sol` into the file.

### 2. Compile
- Go to the **Solidity Compiler** tab.
- Select version `0.8.20`.
- Click **Compile OpLoopVault.sol**.

### 3. Deploy
- Go to the **Deploy & Run Transactions** tab.
- Set "Environment" to **Injected Provider - MetaMask**.
- Ensure MetaMask is on BSC (Chain ID 56) or BSC Testnet (Chain ID 97).
- Click **Deploy**.
- Confirm the transaction in MetaMask.

### 4. Verify on BscScan
- Once deployed, copy the contract address.
- Go to [BscScan](https://bscscan.com/) and search for your address.
- Click **Contract** -> **Verify and Publish**.
- Select **Solidity (Single File)** and Compiler Version `0.8.20`.
- Paste the source code and complete the verification.

## Contract Interfacing

The contract supports:
- `leverageVenus(address vToken, uint256 amount, uint256 targetLeverage)`
- `leverageKinza(address asset, uint256 amount, uint256 targetLeverage)`

> [!WARNING]
> **Flash Loan Fees**: PancakeSwap charges a fee for flash swaps. Ensure the contract has enough balance or the loop profit covers the fee.
> **Beta Status**: This contract is for hackathon demonstration. Always audit and test thoroughly with small amounts first.

## Security Features

The contract includes several layer of protection:
- **ReentrancyGuard**: Prevents nested call attacks.
- **SafeERC20**: Handles tokens with non-standard transfer behaviors.
- **Input Validation**: Leverage is capped at 4x (400) to prevent accidental liquidations.
- **Caller Verification**: The `pancakeCall` function expects to be called only by a legitimate liquidity pair.

> [!CAUTION]
> **Audit Recommended**: This contract has been refactored for security but still requires a professional third-party audit before handling significant funds. Use at your own risk.

## Technical Details

| Asset | Mainnet Address |
| :--- | :--- |
| Pancake Factory | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` |
| Venus Comptroller | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| Kinza Pool | `0x65572E68E5679f44847c223546250149C9853a11` |
