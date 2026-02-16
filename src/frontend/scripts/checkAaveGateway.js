
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

// Re-checking the address from search result carefully: 0x355809Ea3A499696328639C093072236D2106f80
const TARGET = '0x355809Ea3A499696328639C093072236D2106f80';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking ${TARGET}...`);
        const code = await client.getBytecode({ address: TARGET });
        console.log('Bytecode result:', code === undefined ? 'undefined' : code === '0x' ? '0x' : `Length: ${code.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
