
const { createPublicClient, http, parseAbi, formatUnits } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_DATA_PROVIDER = '0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61';
const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const DATA_PROVIDER_ABI = parseAbi([
    'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebtBalance, uint256 currentVariableDebtBalance, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usedAsCollateralEnabled)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Checking User: ${USER_ADDRESS}`);

    try {
        console.log(`\nChecking WBNB (${WBNB})...`);
        const dataW = await client.readContract({
            address: KINZA_DATA_PROVIDER,
            abi: DATA_PROVIDER_ABI,
            functionName: 'getUserReserveData',
            args: [WBNB, USER_ADDRESS]
        });
        console.log(`currentATokenBalance: ${formatUnits(dataW[0], 18)}`);
        console.log(`currentVariableDebtBalance: ${formatUnits(dataW[2], 18)}`);
    } catch (e) {
        console.error('WBNB check failed', e.message);
    }

    try {
        console.log(`\nChecking TARGET (${TARGET})...`);
        const dataT = await client.readContract({
            address: KINZA_DATA_PROVIDER,
            abi: DATA_PROVIDER_ABI,
            functionName: 'getUserReserveData',
            args: [TARGET, USER_ADDRESS]
        });
        console.log(`currentATokenBalance: ${formatUnits(dataT[0], 18)}`);
        console.log(`currentVariableDebtBalance: ${formatUnits(dataT[2], 18)}`);
    } catch (e) {
        console.error('TARGET check failed', e.message);
    }
}

main();
