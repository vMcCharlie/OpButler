
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const ERC20_ABI = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
    'function UNDERLYING_ASSET_ADDRESS() view returns (address)',
    'function underlyingAsset() view returns (address)',
    'function UNDERLYING() view returns (address)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Checking ${TARGET}...`);

    try {
        const sym = await client.readContract({ address: TARGET, abi: ERC20_ABI, functionName: 'symbol' });
        console.log(`Symbol: ${sym}`);
    } catch (e) { console.log('Symbol fetch failed'); }

    try {
        const name = await client.readContract({ address: TARGET, abi: ERC20_ABI, functionName: 'name' });
        console.log(`Name: ${name}`);
    } catch (e) { console.log('Name fetch failed'); }

    try {
        const underlying = await client.readContract({ address: TARGET, abi: ERC20_ABI, functionName: 'UNDERLYING_ASSET_ADDRESS' });
        console.log(`UNDERLYING_ASSET_ADDRESS: ${underlying}`);
    } catch (e) { }

    try {
        const underlying = await client.readContract({ address: TARGET, abi: ERC20_ABI, functionName: 'underlyingAsset' });
        console.log(`underlyingAsset: ${underlying}`);
    } catch (e) { }
}

main();
