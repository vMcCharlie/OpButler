
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_DATA_PROVIDER = '0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const DATA_PROVIDER_ABI = parseAbi([
    'function getReserveData(address asset) view returns (uint256 unscaled, uint256, uint256, uint256, uint256, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address strategyAddress, uint16)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Fetching Reserve Data for WBNB (${WBNB})...`);
        const data = await client.readContract({
            address: KINZA_DATA_PROVIDER,
            abi: DATA_PROVIDER_ABI,
            functionName: 'getReserveData',
            args: [WBNB]
        });

        // logs address directly
        console.log(`aTokenAddress: ${data[5]}`);
        console.log(`variableDebtTokenAddress: ${data[7]}`);
    } catch (e) {
        console.error('getReserveData failed', e.message);
    }
}

main();
