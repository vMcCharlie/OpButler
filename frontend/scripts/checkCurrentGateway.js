
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0x8241cb5b0c83971E9d5FBF2efA10ecEfd9c8EA82'; // Current KINZA_GATEWAY
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
        await client.simulateContract({
            address: TARGET,
            abi: GATEWAY_ABI,
            functionName: 'depositETH',
            args: ['0xcb0620181140e57d1c0d8b724cde623ca963c8c', '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC', 0],
            value: 0n,
            account: '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC'
        });
        console.log('depositETH exists and simulation succeeded!');
    } catch (e) {
        console.error('depositETH check failed:', e.message);
    }
}

main();
