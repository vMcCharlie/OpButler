
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const client = createPublicClient({
    chain: bsc,
    transport: http()
});

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const RADIANT_POOL = '0xCcf31D54C3A94f67b8cEFF8DD771DE5846dA032c';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// Use simpler ABI to avoid parseAbi errors with complex structs
const POOL_ABI = [
    {
        "inputs": [{ "name": "asset", "type": "address" }],
        "name": "getReserveData",
        "outputs": [
            {
                "components": [
                    { "name": "configuration", "type": "uint256" },
                    { "name": "liquidityIndex", "type": "uint128" },
                    { "name": "currentLiquidityRate", "type": "uint128" },
                    { "name": "variableBorrowIndex", "type": "uint128" },
                    { "name": "currentVariableBorrowRate", "type": "uint128" },
                    { "name": "currentStableBorrowRate", "type": "uint128" },
                    { "name": "lastUpdateTimestamp", "type": "uint40" },
                    { "name": "id", "type": "uint16" },
                    { "name": "aTokenAddress", "type": "address" },
                    { "name": "stableDebtTokenAddress", "type": "address" },
                    { "name": "variableDebtTokenAddress", "type": "address" },
                    { "name": "interestRateStrategyAddress", "type": "address" },
                    { "name": "accruedToTreasury", "type": "uint128" },
                    { "name": "unbacked", "type": "uint128" },
                    { "name": "isolationModeTotalDebt", "type": "uint128" }
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const RADIANT_ABI = [
    {
        "inputs": [{ "name": "asset", "type": "address" }],
        "name": "getReserveData",
        "outputs": [
            { "name": "configuration", "type": "uint256" },
            { "name": "liquidityIndex", "type": "uint128" },
            { "name": "currentLiquidityRate", "type": "uint128" },
            { "name": "variableBorrowIndex", "type": "uint128" },
            { "name": "currentVariableBorrowRate", "type": "uint128" },
            { "name": "currentStableBorrowRate", "type": "uint128" },
            { "name": "lastUpdateTimestamp", "type": "uint40" },
            { "name": "aTokenAddress", "type": "address" },
            { "name": "stableDebtTokenAddress", "type": "address" },
            { "name": "variableDebtTokenAddress", "type": "address" },
            { "name": "interestRateStrategyAddress", "type": "address" },
            { "name": "id", "type": "uint8" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function main() {
    console.log('Fetching Kinza BNB Reserve Data...');
    try {
        const kinzaData = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'getReserveData',
            args: [WBNB]
        });
        console.log('Kinza aToken (kBNB):', kinzaData.aTokenAddress);
    } catch (e) {
        console.error('Kinza failed:', e.message);
    }

    console.log('\nFetching Radiant BNB Reserve Data...');
    try {
        const radiantData = await client.readContract({
            address: RADIANT_POOL,
            abi: RADIANT_ABI,
            functionName: 'getReserveData',
            args: [WBNB]
        });
        console.log('Radiant aToken (rBNB):', radiantData[7]);
    } catch (e) {
        console.error('Radiant failed:', e.message);
    }
}

main();
