
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_GATEWAY = '0x8241cb5b0c83971E9d5FBF2efA10ecEfd9c8EA82';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking ${KINZA_GATEWAY}...`);
        const code = await client.getBytecode({ address: KINZA_GATEWAY });
        console.log('Result:', code === undefined ? 'undefined' : code === '0x' ? '0x' : `Length: ${code.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
