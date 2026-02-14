
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const KINZA_POOL = '0xcb0620b181140e57d1c0d8b724cde623ca963c8c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
]);

const ERC20_ABI = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log('Fetching Kinza Reserves...');
        const reserves = await client.readContract({
            address: KINZA_POOL,
            abi: POOL_ABI,
            functionName: 'getReservesList'
        });

        console.log(`Found ${reserves.length} reserves:`);
        for (const addr of reserves) {
            try {
                const sym = await client.readContract({
                    address: addr,
                    abi: ERC20_ABI,
                    functionName: 'symbol'
                });
                console.log(`${addr}: ${sym}`);
            } catch (e) {
                console.log(`${addr}: (NO SYMBOL)`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

main();
