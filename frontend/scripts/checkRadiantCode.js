
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xD0FC69Dc0e720d5be669E53b7B5015F6FC258Ac9'; // RADIANT_GATEWAY in code
const RPC_URL = 'https://bsc-dataseed.binance.org/';

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking ${TARGET}...`);
        const code = await client.getBytecode({ address: TARGET });
        console.log('Result:', code === undefined ? 'undefined' : code === '0x' ? '0x' : `Length: ${code.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
