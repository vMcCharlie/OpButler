
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const ABI = parseAbi([
    'function POOL() view returns (address)',
    'function getPool() view returns (address)',
    'function ADDRESSES_PROVIDER() view returns (address)',
    'function WETH() view returns (address)',
    'function getPoolAddressesProvider() view returns (address)',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Deep checking ${TARGET}...`);

    const functions = [
        'POOL',
        'getPool',
        'ADDRESSES_PROVIDER',
        'WETH',
        'getPoolAddressesProvider'
    ];

    for (const fn of functions) {
        try {
            const result = await client.readContract({
                address: TARGET,
                abi: ABI,
                functionName: fn
            });
            console.log(`${fn}(): ${result}`);
        } catch (e) {
            console.log(`${fn}() failed`);
        }
    }
}

main();
