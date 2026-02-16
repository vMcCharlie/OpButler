
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const RADIANT_POOL = '0xCcf31D54C3A94f67b8cEFF8DD771DE5846dA032c';
const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
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
        console.log(`Checking if ${TARGET} works with RADIANT_POOL...`);
        await client.simulateContract({
            address: TARGET,
            abi: GATEWAY_ABI,
            functionName: 'depositETH',
            args: [RADIANT_POOL, USER, 0],
            value: 0n,
            account: USER
        });
        console.log('SUCCESS: Target IS a Gateway for Radiant Pool!');
    } catch (e) {
        console.error('FAILED with Radiant Pool:', e.message);
    }
}

main();
