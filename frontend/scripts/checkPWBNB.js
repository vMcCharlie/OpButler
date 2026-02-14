
const { createPublicClient, http, parseAbi, formatUnits } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_DATA_PROVIDER = '0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61';
const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const PWBNB = '0xCee8c9cCd07ac0981ef42F80Fb63df3CC36F196e';
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
        console.log(`Checking pWBNB (${PWBNB})...`);
        const data = await client.readContract({
            address: KINZA_DATA_PROVIDER,
            abi: DATA_PROVIDER_ABI,
            functionName: 'getUserReserveData',
            args: [PWBNB, USER_ADDRESS]
        });
        console.log(`currentATokenBalance: ${formatUnits(data[0], 18)}`);
        console.log(`currentVariableDebtBalance: ${formatUnits(data[2], 18)}`);
    } catch (e) {
        console.error('pWBNB check failed', e.message);
    }
}

main();
