
// Run with: npx ts-node scripts/queryPool.ts
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { bsc } from 'viem/chains';

const POOL_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const VTOKEN_ABI = parseAbi([
    'function totalSupply() view returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function symbol() view returns (string)',
    'function underlying() view returns (address)',
    'function decimals() view returns (uint8)'
] as const);

const ERC20_ABI = parseAbi([
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
] as const);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Querying Pool: ${POOL_ADDRESS}`);

    try {
        const symbol = await client.readContract({
            address: POOL_ADDRESS as `0x${string}`,
            abi: VTOKEN_ABI,
            functionName: 'symbol'
        });
        console.log(`Pool Symbol: ${symbol}`);

        const decimals = await client.readContract({
            address: POOL_ADDRESS as `0x${string}`,
            abi: VTOKEN_ABI,
            functionName: 'decimals'
        });
        console.log(`Pool Decimals: ${decimals}`);

        const totalSupply = await client.readContract({
            address: POOL_ADDRESS as `0x${string}`,
            abi: VTOKEN_ABI,
            functionName: 'totalSupply'
        });
        console.log(`Total Supply (Raw): ${totalSupply}`);

        const exchangeRate = await client.readContract({
            address: POOL_ADDRESS as `0x${string}`,
            abi: VTOKEN_ABI,
            functionName: 'exchangeRateStored'
        });
        console.log(`Exchange Rate: ${exchangeRate}`);

        // Try to get underlying
        let underlyingDecimals = 18;
        let underlyingSymbol = 'BNB';

        try {
            const underlyingAddr = await client.readContract({
                address: POOL_ADDRESS as `0x${string}`,
                abi: VTOKEN_ABI,
                functionName: 'underlying'
            });
            console.log(`Underlying Address: ${underlyingAddr}`);

            underlyingDecimals = await client.readContract({
                address: underlyingAddr,
                abi: ERC20_ABI,
                functionName: 'decimals'
            });
            underlyingSymbol = await client.readContract({
                address: underlyingAddr,
                abi: ERC20_ABI,
                functionName: 'symbol'
            });
        } catch (e) {
            console.log('No underlying() function found, assuming Native/BNB or similar.');
        }

        console.log(`Underlying Asset: ${underlyingSymbol} (Decimals: ${underlyingDecimals})`);

        // Calculate Supply in Underlying
        // underlying = (totalSupply * exchangeRate) / 1e18
        const supplyUnderlyingWei = (totalSupply * exchangeRate) / BigInt("1000000000000000000");
        const supplyUnderlying = formatUnits(supplyUnderlyingWei, underlyingDecimals);

        console.log(`\nTotal Supply (Underlying Amount): ${supplyUnderlying} ${underlyingSymbol}`);

        // Fetch Price (using public API for simplicity in script, e.g. Binance API or hardcoded if BNB)
        let price = 0;
        if (underlyingSymbol.includes('BNB')) {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            const data = await res.json();
            price = parseFloat(data.price);
            console.log(`Current BNB Price: $${price}`);
        } else {
            console.log(`Price fetch not automated for ${underlyingSymbol}, please check manually.`);
        }

        if (price > 0) {
            const supplyUSD = parseFloat(supplyUnderlying) * price;
            console.log(`Total Supply Value (USD): $${supplyUSD.toLocaleString()}`);
        }

        // Check if user balance was requested (if user provides address later)
        // const userBalance = await client.readContract({ ... balanceOf ... })

    } catch (e) {
        console.error('Error querying contract:', e);
    }
}

main();
