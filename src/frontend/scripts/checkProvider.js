
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const PROVIDER_ABI = parseAbi([
    'function getPool() view returns (address)',
    'function getPoolDataProvider() view returns (address)',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking if ${TARGET} is AddressesProvider...`);
        const pool = await client.readContract({
            address: TARGET,
            abi: PROVIDER_ABI,
            functionName: 'getPool'
        });
        console.log(`getPool(): ${pool}`);

        const dp = await client.readContract({
            address: TARGET,
            abi: PROVIDER_ABI,
            functionName: 'getPoolDataProvider'
        });
        console.log(`getPoolDataProvider(): ${dp}`);
    } catch (e) {
        console.error('Not an AddressesProvider', e.message);
    }
}

main();
