// Find correct DataProvider from PoolAddressesProvider
const { createPublicClient, http, parseAbi, formatUnits, getAddress, keccak256, toBytes, encodePacked } = require('viem');
const { bsc } = require('viem/chains');

const USER = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const PROVIDER = getAddress('0x64a59e3a3a2d15d03e868618261af12c3deee27c');
const POOL = getAddress('0xccf31d54c3a94f67b8ceff8dd771de5846da032c');
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const PROVIDER_ABI = parseAbi([
    'function getLendingPool() view returns (address)',
    'function getLendingPoolCore() view returns (address)',
    'function getAddress(bytes32 id) view returns (address)'
]);

// Aave V2 uses getReserveData on the Pool directly
const POOL_V2_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
    'function getReserveData(address asset) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, address, address, address, address, uint8)',
    'function getUserAccountData(address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
]);

const ERC20_ABI = parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
]);

async function main() {
    const client = createPublicClient({ chain: bsc, transport: http(RPC_URL) });

    console.log(`=== Find Radiant DataProvider ===\n`);

    // Aave V2: LENDING_POOL_DATA_PROVIDER = bytes32("LENDING_POOL_DATA_PROVIDER")
    // But getAddress takes a bytes32 ID. Try known IDs.
    const ids = [
        { name: 'LENDING_POOL', hex: '0x0000000000000000000000000000000000000000000000000000000000000001' },
        { name: 'LENDING_POOL_CORE', hex: '0x0000000000000000000000000000000000000000000000000000000000000002' },
        { name: 'DATA_PROVIDER (0x01)', hex: '0x0100000000000000000000000000000000000000000000000000000000000000' },
    ];

    for (const id of ids) {
        try {
            const addr = await client.readContract({ address: PROVIDER, abi: PROVIDER_ABI, functionName: 'getAddress', args: [id.hex] });
            console.log(`${id.name}: ${addr}`);
        } catch (e) {
            console.log(`${id.name} failed`);
        }
    }

    // Try using Pool.getReserveData directly (Aave V2 pattern)
    console.log(`\n--- Using Pool.getReserveData directly ---`);
    const reserves = await client.readContract({ address: POOL, abi: POOL_V2_ABI, functionName: 'getReservesList' });

    let bnbPrice = 0;
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
        bnbPrice = parseFloat((await res.json()).price);
    } catch (e) { }

    for (const r of reserves) {
        const sym = await client.readContract({ address: r, abi: ERC20_ABI, functionName: 'symbol' });
        try {
            const data = await client.readContract({ address: POOL, abi: POOL_V2_ABI, functionName: 'getReserveData', args: [r] });
            // Aave V2 getReserveData returns tuple:
            // (configuration, liquidityIndex, variableBorrowIndex, currentLiquidityRate, currentVariableBorrowRate,
            //  currentStableBorrowRate, lastUpdateTimestamp, aTokenAddress, stableDebtTokenAddress,
            //  variableDebtTokenAddress, interestRateStrategyAddress, id)
            const aTokenAddr = data[7];
            const stableDebtAddr = data[8];
            const varDebtAddr = data[9];
            const dec = await client.readContract({ address: r, abi: ERC20_ABI, functionName: 'decimals' });

            const aTokenBal = await client.readContract({ address: aTokenAddr, abi: ERC20_ABI, functionName: 'balanceOf', args: [USER] });
            const varDebtBal = await client.readContract({ address: varDebtAddr, abi: ERC20_ABI, functionName: 'balanceOf', args: [USER] });

            if (aTokenBal > BigInt(0) || varDebtBal > BigInt(0)) {
                const supplyAmt = parseFloat(formatUnits(aTokenBal, dec));
                const borrowAmt = parseFloat(formatUnits(varDebtBal, dec));

                let price = 0;
                if (sym === 'WBNB') price = bnbPrice;
                else if (['USDT', 'USDC', 'BUSD', 'FDUSD'].includes(sym)) price = 1;
                else if (sym === 'BTCB') {
                    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                    price = parseFloat((await res.json()).price);
                } else if (sym === 'ETH' || sym === 'wBETH' || sym === 'wstETH') {
                    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
                    price = parseFloat((await res.json()).price);
                }

                console.log(`\n>>> ${sym} POSITION!`);
                console.log(`    aToken: ${aTokenAddr}`);
                console.log(`    Supply: ${supplyAmt} (~$${(supplyAmt * price).toFixed(2)})`);
                console.log(`    Borrow: ${borrowAmt} (~$${(borrowAmt * price).toFixed(2)})`);
            }
        } catch (e) {
            console.log(`${sym} getReserveData: ${e.shortMessage}`);
        }
    }
}

main();
