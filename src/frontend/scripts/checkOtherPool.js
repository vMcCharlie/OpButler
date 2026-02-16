
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

// Address from queryKinzaPosition.ts
const OTHER_POOL = '0xcb0620b13867623a9686a34d580436d463ca963c8c';
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
        console.log(`Checking OTHER Pool: ${OTHER_POOL}...`);
        const reserves = await client.readContract({
            address: OTHER_POOL,
            abi: POOL_ABI,
            functionName: 'getReservesList'
        });

        console.log(`Found ${reserves.length} reserves in this address.`);
    } catch (e) {
        console.error('Not a Pool with getReservesList()', e.message);
    }
}

main();
