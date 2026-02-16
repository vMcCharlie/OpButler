
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0x211d4b4e95f9d891cd6e4ee74321b70d315cd73d';
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
