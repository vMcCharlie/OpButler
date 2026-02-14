
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
    'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))'
]);

const ERC20_ABI = parseAbi(['function symbol() view returns (string)']);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        const reserves = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'getReservesList'
        });

        console.log(`Mapping ${reserves.length} reserves...`);
        for (const asset of reserves) {
            try {
                const sym = await client.readContract({ address: asset, abi: ERC20_ABI, functionName: 'symbol' });
                const data = await client.readContract({
                    address: KINZA_POOL,
                    abi: POOL_ABI,
                    functionName: 'getReserveData',
                    args: [asset]
                });
                console.log(`${sym} (${asset}): aToken = ${data.aTokenAddress}`);
            } catch (e) {
                // skip if fails
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

main();
