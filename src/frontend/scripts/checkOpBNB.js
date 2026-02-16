
const { createPublicClient, http } = require('viem');

const OP_BNB_RPC = 'https://opbnb-mainnet-rpc.bnbchain.org';
const TARGET = '0x8241cb5b0c83971E9d5FBF2efA10ecEfd9c8EA82';

async function main() {
    const client = createPublicClient({
        transport: http(OP_BNB_RPC)
    });

    try {
        console.log(`Checking ${TARGET} on opBNB...`);
        const code = await client.getBytecode({ address: TARGET });
        console.log('Result:', code === undefined ? 'undefined' : code === '0x' ? '0x' : `Length: ${code.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
