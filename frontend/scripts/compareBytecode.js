
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_GATEWAY = '0x8241cb5b0c83971E9d5FBF2efA10ecEfd9c8EA82';
const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking KINZA_GATEWAY (${KINZA_GATEWAY})...`);
        const code1 = await client.getBytecode({ address: KINZA_GATEWAY });
        console.log(`Bytecode length: ${code1?.length}`);

        console.log(`Checking TARGET (${TARGET})...`);
        const code2 = await client.getBytecode({ address: TARGET });
        console.log(`Bytecode length: ${code2?.length}`);

        if (code1 === code2) {
            console.log('MATCH: Bytecode is identical!');
        } else {
            console.log('NO MATCH: Bytecode is different.');
        }
    } catch (e) {
        console.error('Check failed:', e.message);
    }
}

main();
