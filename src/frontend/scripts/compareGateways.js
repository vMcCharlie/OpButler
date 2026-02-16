
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const KINZA_GATEWAY = '0x8241cb5b0c83971E9d5FBF2efA10ecEfd9c8EA82';
const RADIANT_HUB = '0xCC650b486f723C924370656b509a82bD69526739';
const USER = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const GATEWAY_ABI = parseAbi([
    'function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) payable',
]);

async function check(name, target) {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking ${name} (${target})...`);
        await client.simulateContract({
            address: target,
            abi: GATEWAY_ABI,
            functionName: 'depositETH',
            args: [KINZA_POOL, USER, 0],
            value: 0n,
            account: USER
        });
        console.log(`  RESULT: ${name} is a VALID Gateway for Kinza Pool!`);
    } catch (e) {
        console.error(`  RESULT: ${name} failed:`, e.message);
    }
}

async function main() {
    await check('KINZA_GATEWAY', KINZA_GATEWAY);
    await check('RADIANT_HUB (USER_ADDRESS)', RADIANT_HUB);
}

main();
