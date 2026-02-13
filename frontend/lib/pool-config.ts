import { parseAbi } from 'viem';
import allowedAssets from '@/lib/allowedAssets.json';

// ============================================================================
//                        CONTRACT ADDRESSES (BSC MAINNET)
// ============================================================================

// Venus
export const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384' as `0x${string}`;

// Kinza (Aave V3 fork)
export const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c' as `0x${string}`;

// Radiant (Aave V2 fork)
export const RADIANT_LENDING_POOL = '0xCcf31D54C3A94f67b8cEFF8DD771DE5846dA032c' as `0x${string}`;

// PancakeSwap V2 Router
export const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`;

// vToken Mappings for Venus (Asset Symbol -> vToken Address)
export const VENUS_VTOKENS: Record<string, `0x${string}`> = {
    'BNB': '0xA07c5b74C9B40447a954e1466938b865b6BBe19B', // vBNB
    'WBNB': '0xA07c5b74C9B40447a954e1466938b865b6BBe19B',
    'USDT': '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
    'USDC': '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',
    'BTCB': '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',
    'ETH': '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',
    'XRP': '0xB248a295732e0225acd3337607cc01068e6b9c53',
    'ADA': '0x9A0AF7FDb2065Ce470D72C1C09a1328814478e19',
    'DOT': '0x1610bc33319e9398de5f57B33a5b184c806aD217',
    'LTC': '0x57A5297F2cB2c0AaC9D554660acd6D385Ab87c65',
    'BCH': '0x5F0388EBc2B94FA8E123F404b79cCF5f40b29176',
    'LINK': '0x650b940a1033B8A1b1873f78730FcfC73ec11f1f',
    'FIL': '0xf91d58b5aE142DAcC749f58A49FCBac340Cb0343',
    'DAI': '0x334b3eCB4DCa3593BCCC3c7EBD1A1C1d1780FBF1',
    'CAKE': '0x86aC3974e2bd0d60825230fa6F355fF11409df5c',
    'SOL': '0x27FF564707786720C71A2e5c1490A63266683612',
    'FDUSD': '0xC4eF4229FEc74Ccfe17B2bdeF7715fAC740BA0ba',
    'XVS': '0x151B1e2635A717bcDc836ECd6FbB62B674FE78E5',
};

// Static underlying token addresses (used as fallback)
export const UNDERLYING_TOKENS: Record<string, `0x${string}`> = {
    'BTCB': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    'XRP': '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'BNB': '0x0000000000000000000000000000000000000000',
    'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    'ADA': '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    'DOT': '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    'LTC': '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94',
    'BCH': '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf',
    'LINK': '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    'FIL': '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153',
    'DAI': '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    'SOL': '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    'FDUSD': '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
    'XVS': '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63',
    'WBETH': '0xa2E3356610840701BDf5611a53974510Ae27E2e1',
};

// ============================================================================
//                        HELPER FUNCTIONS
// ============================================================================

/**
 * Get the underlying token address for a symbol + project combo.
 * Uses allowedAssets.json underlyingTokens array first, then fallback to static map.
 */
export function getUnderlyingAddress(symbol: string, project: string): `0x${string}` | undefined {
    if (symbol === 'BNB' || symbol === 'WBNB') return undefined; // Native BNB

    // Find in allowedAssets.json
    const protocolKey = project === 'venus' ? 'venus' :
        project === 'kinza-finance' ? 'kinza' :
            project === 'radiant-v2' ? 'radiant' : null;

    if (protocolKey && (allowedAssets as any)[protocolKey]) {
        const asset = ((allowedAssets as any)[protocolKey] as any[]).find(
            (a: any) => a.symbol === symbol || a.originalSymbol === symbol
        );
        if (asset?.underlyingTokens?.[0]) {
            return asset.underlyingTokens[0] as `0x${string}`;
        }
    }

    return UNDERLYING_TOKENS[symbol] || undefined;
}

/**
 * Get the target contract address for deposit/withdraw/borrow/repay.
 */
export function getProtocolAddress(project: string, symbol: string): `0x${string}` | undefined {
    if (project === 'venus') {
        return VENUS_VTOKENS[symbol];
    }
    if (project === 'kinza-finance') {
        return KINZA_POOL;
    }
    if (project === 'radiant-v2') {
        return RADIANT_LENDING_POOL;
    }
    return undefined;
}

/**
 * Get the approval target (which contract the user needs to approve).
 */
export function getApprovalTarget(project: string, symbol: string): `0x${string}` | undefined {
    if (project === 'venus') return VENUS_VTOKENS[symbol]; // approve vToken
    if (project === 'kinza-finance') return KINZA_POOL; // approve Pool
    if (project === 'radiant-v2') return RADIANT_LENDING_POOL; // approve LendingPool
    return undefined;
}

// ============================================================================
//                              ABIs
// ============================================================================

export const ERC20_ABI = parseAbi([
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

// Venus Comptroller ABI
export const COMPTROLLER_ABI = parseAbi([
    'function getAssetsIn(address account) view returns (address[])',
    'function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)',
    'function enterMarkets(address[] calldata vTokens) returns (uint256[])',
    'function exitMarket(address vToken) returns (uint256)',
    'function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)',
    'function getAllMarkets() view returns (address[])',
]);

// Venus vToken ABI — ERC20 operations (no payable mint)
export const VTOKEN_ABI = parseAbi([
    'function mint(uint256 mintAmount) returns (uint256)',
    'function redeem(uint256 redeemTokens) returns (uint256)',
    'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function balanceOfUnderlying(address owner) returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function borrowBalanceStored(address account) view returns (uint256)',
    'function borrow(uint256 borrowAmount) returns (uint256)',
    'function repayBorrow(uint256 repayAmount) returns (uint256)',
]);

// Separate ABI for vBNB native operations (payable, no args)
export const VBNB_ABI = parseAbi([
    'function mint() payable',
    'function repayBorrow() payable',
    'function redeem(uint256 redeemTokens) returns (uint256)',
    'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',
    'function borrow(uint256 borrowAmount) returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function borrowBalanceStored(address account) view returns (uint256)',
]);

// Kinza (Aave V3 fork) Pool ABI
export const KINZA_POOL_ABI = parseAbi([
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
    'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
]);

// Radiant (Aave V2 fork) LendingPool ABI
export const RADIANT_POOL_ABI = parseAbi([
    'function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
    'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) returns (uint256)',
]);

// WETH Gateway ABI (for native BNB deposits/withdrawals on Kinza/Radiant)
export const WETH_GATEWAY_ABI = parseAbi([
    'function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) payable',
    'function withdrawETH(address lendingPool, uint256 amount, address to)',
    'function borrowETH(address lendingPool, uint256 amount, uint256 interestRateMode, uint16 referralCode)',
    'function repayETH(address lendingPool, uint256 amount, uint256 rateMode, address onBehalfOf) payable',
]);

// Kinza WrappedTokenGatewayV3 (BSC)
export const KINZA_GATEWAY = '0x8241cb5b0c83971E9d5FBF2efA10ecEfd9c8EA82' as `0x${string}`;

// Radiant WETHGateway (BSC)
export const RADIANT_GATEWAY = '0xD0FC69Dc0e720d5be669E53b7B5015F6FC258Ac9' as `0x${string}`;

// Legacy generic alias
export const LENDING_POOL_ABI = KINZA_POOL_ABI;
