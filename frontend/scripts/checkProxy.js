
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking bytecode for ${TARGET}...`);
        const code = await client.getBytecode({ address: TARGET });
        if (!code || code === '0x') {
            console.log('No bytecode found (EOA?)');
        } else {
            console.log(`Bytecode length: ${code.length}`);
            // Check for common proxy patterns (e.g., EIP-1967)
            // Storage slot for implementation: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
            const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
            const storage = await client.getStorageAt({
                address: TARGET,
                slot: implSlot
            });
            console.log(`Implementation slot storage: ${storage}`);
            if (storage && storage !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.log(`Likely a proxy! Implementation at: 0x${storage.slice(-40)}`);
            }
        }
    } catch (e) {
        console.error('Check failed:', e.message);
    }
}

main();
