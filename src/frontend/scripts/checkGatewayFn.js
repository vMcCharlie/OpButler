
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
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
        console.log(`Checking if ${TARGET} has depositETH...`);
        // We can't "read" a payable function that modifies state, 
        // but we can check if it exists in the byte code or try to "simulate" it.
        // Or we can check if it's a proxy and find the implementation.

        // Let's try to simulate a call (static call)
        // Note: depositETH is payable, so we might need to send value 0 or something.
        // But usually, if it doesn't exist, it will revert with "function not found" or "fallback not allowed".

        await client.simulateContract({
            address: TARGET,
            abi: GATEWAY_ABI,
            functionName: 'depositETH',
            args: ['0xcb0620b181140e57d1c0d8b724cde623ca963c8c', '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC', 0],
            value: 0n,
            account: '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC'
        });
        console.log('depositETH exists and simulation succeeded (with value 0)!');
    } catch (e) {
        console.error('depositETH check failed:', e.message);
    }
}

main();
