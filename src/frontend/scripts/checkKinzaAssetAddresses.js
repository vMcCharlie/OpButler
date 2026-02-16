
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const POOL_ABI = parseAbi([
    'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Fetching Pool Reserve Data for WBNB (${WBNB})...`);
        const data = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'getReserveData',
            args: [WBNB]
        });

        console.log(`aTokenAddress: ${data.aTokenAddress}`);
        console.log(`variableDebtTokenAddress: ${data.variableDebtTokenAddress}`);
    } catch (e) {
        console.error('getReserveData failed', e.message);
    }
}

main();
