import { parseAbi } from 'viem';

// --- Contract Addresses (BSC Mainnet) ---
// Note: These are example addresses. In a real prod app, you'd fetch these from a config or subgraph.

export const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384';
export const KINZA_COMPTROLLER = '0x...'; // Placeholder if specific comptroller needed
export const RADIANT_LENDING_POOL = '0x...'; // Placeholder

// vToken Mappings for Venus (Asset Symbol -> vToken Address)
// Source: Venus Protocol Docs / BscScan
export const VENUS_VTOKENS: Record<string, `0x${string}`> = {
    'BNB': '0xA07c5b74C9B40447a954e1466938b865b6BBe19B', // vBNB
    'WBNB': '0xA07c5b74C9B40447a954e1466938b865b6BBe19B', // Treated as BNB on Venus usually (vBNB)
    'USDT': '0xfD5840Cd36d94D7229439859C0112a4185BC0255', // vUSDT
    'USDC': '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8', // vUSDC
    'BTCB': '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B', // vBTC
    'ETH': '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8', // vETH
    'XRP': '0xB248a295732e0225acd3337607cc01068e6b9c53', // vXRP
};

// Underlying Token Addresses (Binance-Pegged versions on BSC)
export const UNDERLYING_TOKENS: Record<string, `0x${string}`> = {
    'BTCB': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    'XRP': '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'BNB': '0x0000000000000000000000000000000000000000', // Native
    'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
};

// --- ABIs ---

export const ERC20_ABI = parseAbi([
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

// Venus vToken ABI (Mint/Redeem)
export const VTOKEN_ABI = parseAbi([
    // Supply (Mint)
    'function mint(uint256 mintAmount) returns (uint256)', // For ERC20
    'function mint() payable', // For BNB

    // Withdraw (Redeem)
    'function redeem(uint256 redeemTokens) returns (uint256)',
    'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',

    // Read
    'function balanceOf(address owner) view returns (uint256)',
    'function balanceOfUnderlying(address owner) returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',

    // Borrow
    'function borrow(uint256 borrowAmount) returns (uint256)',
    'function repayBorrow(uint256 repayAmount) returns (uint256)',
    'function repayBorrow() payable' // For BNB
]);

// Generic Lending Pool ABI (Kinza/Radiant style - typically Aave forks)
export const LENDING_POOL_ABI = parseAbi([
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    'function withdraw(address asset, uint256 amount, address to)',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
    'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)'
]);
