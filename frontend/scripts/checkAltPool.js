
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking if ${TARGET} is a Pool...`);
        const reserves = await client.readContract({
            address: TARGET,
            abi: POOL_ABI,
            functionName: 'getReservesList'
        });

        console.log(`Found ${reserves.length} reserves in this address.`);
    } catch (e) {
        console.error('Not a Pool with getReservesList()', e.message);
    }
}

main();
