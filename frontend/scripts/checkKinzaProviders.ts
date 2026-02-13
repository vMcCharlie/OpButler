
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { bsc } from 'viem/chains';

const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const POOL_ADDRESSES_PROVIDER = '0x7a3074d284aF13155160A16c026D7B7410022370'; // Kinza PoolAddressesProvider
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const PROVIDER_ABI = parseAbi([
    'function getPool() view returns (address)'
]);

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
    'function getReserveData(address asset) view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id)'
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

    console.log(`Checking Kinza via PoolAddressesProvider: ${POOL_ADDRESSES_PROVIDER}`);

    try {
        // 1. Get Pool Address
        const poolAddress = await client.readContract({
            address: POOL_ADDRESSES_PROVIDER,
            abi: PROVIDER_ABI,
            functionName: 'getPool'
        });
        console.log(`Pool Address: ${poolAddress}`);

        // 2. Get Reserves List
        const reserves = await client.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'getReservesList'
        }) as `0x${string}`[];

        console.log(`Found ${reserves.length} reserves given by Pool.`);

        let totalSupplyUSD = 0;
        let totalBorrowUSD = 0;

        let bnbPrice = 0;
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            const data = await res.json();
            bnbPrice = parseFloat(data.price);
        } catch (e) { }

        // 3. Iterate Reserves (Sequential for script simplicity)
        for (const asset of reserves) {
            const reserveData = await client.readContract({
                address: poolAddress,
                abi: POOL_ABI,
                functionName: 'getReserveData',
                args: [asset]
            });

            // reserveData tuple extraction (viem returns array or object depending on config, usually object/array mix)
            // ABI returns struct-like tuple.
            // Aave V3 getReserveData returns:
            // (configuration, liqIndex, curLiqRate, varBorrowIndex, curVarBorrowRate, curStableBorrowRate, lastUpdate, aTokenAddr, stableDebtAddr, varDebtAddr, strategyAddr, id)
            // Index 7: aTokenAddress
            // Index 9: variableDebtTokenAddress

            // Viem might return array.
            const aTokenAddress = reserveData[7];
            const varDebtTokenAddress = reserveData[9];

            // 4. Check User Balances
            const aTokenBal = await client.readContract({
                address: aTokenAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [USER_ADDRESS]
            }) as bigint;

            const varDebtBal = await client.readContract({
                address: varDebtTokenAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [USER_ADDRESS]
            }) as bigint;

            if (aTokenBal > BigInt(0) || varDebtBal > BigInt(0)) {
                // Get Underlying Token Details
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

                // Price
                let price = 0;
                if (symbol === 'WBNB' || symbol === 'BNB') price = bnbPrice;
                else if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(symbol)) price = 1;
                else if (symbol.includes('BTC')) {
                    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                    const data = await res.json();
                    price = parseFloat(data.price);
                }

                console.log(`\n--- ${symbol} ---`);

                if (aTokenBal > BigInt(0)) {
                    const supply = parseFloat(formatUnits(aTokenBal, decimals));
                    const val = supply * price;
                    totalSupplyUSD += val;
                    console.log(`  Supply: ${supply} ${symbol} (~$${val.toFixed(2)})`);
                }

                if (varDebtBal > BigInt(0)) {
                    const borrow = parseFloat(formatUnits(varDebtBal, decimals));
                    const val = borrow * price;
                    totalBorrowUSD += val;
                    console.log(`  Borrow: ${borrow} ${symbol} (~$${val.toFixed(2)})`);
                }
            }
        }

        console.log('\n=== Kinza Summary ===');
        console.log(`Total Supplied: $${totalSupplyUSD.toFixed(2)}`);
        console.log(`Total Borrowed: $${totalBorrowUSD.toFixed(2)}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
