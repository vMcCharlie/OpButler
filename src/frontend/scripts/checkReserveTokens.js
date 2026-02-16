
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_DATA_PROVIDER = '0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const DP_ABI = parseAbi([
    'function getReserveTokensAddresses(address asset) view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress)',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking tokens for WBNB (${WBNB})...`);
        const data = await client.readContract({
            address: KINZA_DATA_PROVIDER,
            abi: DP_ABI,
            functionName: 'getReserveTokensAddresses',
            args: [WBNB]
        });

        console.log(`aTokenAddress: ${data[0]}`);
        console.log(`stableDebtTokenAddress: ${data[1]}`);
        console.log(`variableDebtTokenAddress: ${data[2]}`);
    } catch (e) {
        console.error('getReserveTokensAddresses failed', e.message);
    }
}

main();
