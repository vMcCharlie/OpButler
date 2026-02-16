// Query Kinza Finance positions (Aave V3 fork) on BSC
// Run with: node scripts/queryKinza.js

const { createPublicClient, http, parseAbi, formatUnits, getAddress } = require('viem');
const { bsc } = require('viem/chains');

const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';

// Official addresses from https://docs.kinza.finance/resources/deployed-contracts/bnb-chain
const KINZA_POOL = getAddress('0xcb0620b181140e57d1c0d8b724cde623ca963c8c');
const KINZA_DATA_PROVIDER = getAddress('0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61');
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
    'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
]);

const DATA_PROVIDER_ABI = parseAbi([
    'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebtBalance, uint256 currentVariableDebtBalance, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usedAsCollateralEnabled)'
]);

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Querying Kinza Finance for: ${USER_ADDRESS}`);
    console.log(`Pool: ${KINZA_POOL}`);
    console.log(`DataProvider: ${KINZA_DATA_PROVIDER}\n`);

    try {
        // 1. Get overall account data
        const accountData = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'getUserAccountData',
            args: [USER_ADDRESS]
        });

        // Aave V3 returns values in base currency (USD with 8 decimals)
        const totalCollateralUSD = Number(accountData[0]) / 1e8;
        const totalDebtUSD = Number(accountData[1]) / 1e8;
        const availableBorrowsUSD = Number(accountData[2]) / 1e8;
        const healthFactor = Number(accountData[5]) / 1e18;

        console.log(`=== Account Overview ===`);
        console.log(`Total Collateral: $${totalCollateralUSD.toFixed(2)}`);
        console.log(`Total Debt: $${totalDebtUSD.toFixed(2)}`);
        console.log(`Available Borrows: $${availableBorrowsUSD.toFixed(2)}`);
        console.log(`Health Factor: ${healthFactor.toFixed(4)}`);
        console.log(`Net Worth: $${(totalCollateralUSD - totalDebtUSD).toFixed(2)}`);

        // 2. Get reserves list for per-asset breakdown
        const reserves = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'getReservesList'
        });
        console.log(`\nFound ${reserves.length} reserves. Checking individual positions...`);

        // 3. Fetch prices
        let bnbPrice = 0;
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            const data = await res.json();
            bnbPrice = parseFloat(data.price);
        } catch (e) { }

        // 4. Per-asset breakdown via DataProvider
        for (const asset of reserves) {
            try {
                const userData = await client.readContract({
                    address: KINZA_DATA_PROVIDER,
                    abi: DATA_PROVIDER_ABI,
                    functionName: 'getUserReserveData',
                    args: [asset, USER_ADDRESS]
                });

                const aTokenBalance = userData[0];
                const stableDebt = userData[1];
                const variableDebt = userData[2];

                if (aTokenBalance > BigInt(0) || stableDebt > BigInt(0) || variableDebt > BigInt(0)) {
                    const decimals = await client.readContract({
                        address: asset,
                        abi: ERC20_ABI,
                        functionName: 'decimals'
                    });
                    const symbol = await client.readContract({
                        address: asset,
                        abi: ERC20_ABI,
                        functionName: 'symbol'
                    });

                    // Price lookup
                    let price = 0;
                    if (symbol === 'WBNB' || symbol === 'BNB') price = bnbPrice;
                    else if (['USDT', 'USDC', 'DAI', 'BUSD', 'FDUSD'].includes(symbol)) price = 1;
                    else if (symbol.includes('BTC') || symbol === 'BTCB') {
                        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                        const data = await res.json();
                        price = parseFloat(data.price);
                    } else if (symbol === 'ETH' || symbol.includes('ETH')) {
                        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
                        const data = await res.json();
                        price = parseFloat(data.price);
                    } else if (symbol === 'XRP') {
                        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT');
                        const data = await res.json();
                        price = parseFloat(data.price);
                    } else if (symbol === 'SOL') {
                        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
                        const data = await res.json();
                        price = parseFloat(data.price);
                    }

                    console.log(`\n--- ${symbol} ---`);
                    if (aTokenBalance > BigInt(0)) {
                        const supply = parseFloat(formatUnits(aTokenBalance, decimals));
                        console.log(`  Supply: ${supply} ${symbol} (~$${(supply * price).toFixed(2)})`);
                    }
                    if (variableDebt > BigInt(0)) {
                        const borrow = parseFloat(formatUnits(variableDebt, decimals));
                        console.log(`  Variable Debt: ${borrow} ${symbol} (~$${(borrow * price).toFixed(2)})`);
                    }
                    if (stableDebt > BigInt(0)) {
                        const borrow = parseFloat(formatUnits(stableDebt, decimals));
                        console.log(`  Stable Debt: ${borrow} ${symbol} (~$${(borrow * price).toFixed(2)})`);
                    }
                }
            } catch (e) {
                // Skip assets that fail
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
