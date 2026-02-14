
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const POOL_ABI = parseAbi([
    'function ADDRESSES_PROVIDER() view returns (address)',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking ADDRESSES_PROVIDER on ${KINZA_POOL}...`);
        const provider = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'ADDRESSES_PROVIDER'
        });

        console.log(`ADDRESSES_PROVIDER: ${provider}`);
    } catch (e) {
        console.error('Failed ADDRESSES_PROVIDER()', e.message);
    }
}

main();
