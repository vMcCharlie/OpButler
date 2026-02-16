
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const ABI = parseAbi([
    'function getAllMarkets() view returns (address[])',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking getAllMarkets() on ${TARGET}...`);
        const markets = await client.readContract({
            address: TARGET,
            abi: ABI,
            functionName: 'getAllMarkets'
        });

        console.log(`Found ${markets.length} markets in this address.`);
        for (const m of markets) {
            console.log(m);
        }
    } catch (e) {
        console.error('Failed getAllMarkets()', e.message);
    }
}

main();
