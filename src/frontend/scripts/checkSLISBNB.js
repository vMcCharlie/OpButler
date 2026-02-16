
const { createPublicClient, http, parseAbi, formatUnits } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_DATA_PROVIDER = '0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61';
const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const SLISBNB = '0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const DATA_PROVIDER_ABI = parseAbi([
    'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebtBalance, uint256 currentVariableDebtBalance, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usedAsCollateralEnabled)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking slisBNB (${SLISBNB})...`);
        const data = await client.readContract({
            address: KINZA_DATA_PROVIDER,
            abi: DATA_PROVIDER_ABI,
            functionName: 'getUserReserveData',
            args: [SLISBNB, USER_ADDRESS]
        });
        console.log(`currentATokenBalance: ${formatUnits(data[0], 18)}`);
        console.log(`currentVariableDebtBalance: ${formatUnits(data[2], 18)}`);
    } catch (e) {
        console.error('slisBNB check failed', e.message);
    }
}

main();
