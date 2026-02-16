
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0x355809Ea3A499696328639C093072236D2106f80'; // Aave V3 BSC Hub?
const RPC_URL = 'https://bsc-dataseed.binance.org/';

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking ${TARGET} on BSC...`);
        const code = await client.getBytecode({ address: TARGET });
        console.log('Result:', code === undefined ? 'undefined' : code === '0x' ? '0x' : `Length: ${code.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
