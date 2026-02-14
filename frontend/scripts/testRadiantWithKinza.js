
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const RADIANT_GATEWAY = '0xD0FC69Dc0e720d5be669E53b7B5015F6FC258Ac9';
const USER = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const GATEWAY_ABI = parseAbi([
    'function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) payable',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking if RADIANT_GATEWAY (${RADIANT_GATEWAY}) works with KINZA_POOL...`);
        await client.simulateContract({
            address: RADIANT_GATEWAY,
            abi: GATEWAY_ABI,
            functionName: 'depositETH',
            args: [KINZA_POOL, USER, 0],
            value: 0n,
            account: USER
        });
        console.log('SUCCESS: RADIANT_GATEWAY works with KINZA_POOL!');
    } catch (e) {
        console.error('FAILED with KINZA_POOL:', e.message);
    }
}

main();
