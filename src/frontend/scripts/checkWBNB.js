
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const ABI = parseAbi([
    'function WBNB() view returns (address)',
    'function getWBNB() view returns (address)',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking WBNB on ${TARGET}...`);
        const wbnb = await client.readContract({
            address: TARGET,
            abi: ABI,
            functionName: 'WBNB'
        });
        console.log(`WBNB(): ${wbnb}`);
    } catch (e) {
        console.log('WBNB() failed');
    }

    try {
        const gwbnb = await client.readContract({
            address: TARGET,
            abi: ABI,
            functionName: 'getWBNB'
        });
        console.log(`getWBNB(): ${gwbnb}`);
    } catch (e) {
        console.log('getWBNB() failed');
    }
}

main();
