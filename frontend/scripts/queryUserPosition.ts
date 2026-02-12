
// Run with: node scripts/dist/queryUserPosition.js
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { bsc } from 'viem/chains';

const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
// Use lowercase to avoid checksum errors with viem if checksum is wrong
const VENUS_COMPTROLLER = '0xfd36e2c2a6789db23113685031d7f16329158384';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

// ABIs
const COMPTROLLER_ABI = parseAbi([
    'function getAllMarkets() view returns (address[])'
]);

const VTOKEN_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function borrowBalanceStored(address account) view returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function underlying() view returns (address)'
]);

const ERC20_ABI = parseAbi([
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Querying User Positions (Supply & Borrow): ${USER_ADDRESS}`);

    try {        
        console.log('Fetching all markets...');
        const allMarkets = (await client.readContract({
            address: VENUS_COMPTROLLER as `0x${string}`,
            abi: COMPTROLLER_ABI,
            functionName: 'getAllMarkets'
        } as any)) as `0x${string}`[];
        
        console.log(`Found ${allMarkets.length} markets. Checking positions...`);

        let totalSupplyUSD = 0;
        let totalBorrowUSD = 0;
        
        let bnbPrice = 0;
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            const data = await res.json();
            bnbPrice = parseFloat(data.price);
            console.log(`BNB Price: $${bnbPrice}`);
        } catch(e) { console.log('Failed to fetch BNB price'); }

        for (const market of allMarkets) {
            // multicall or parallel would be faster, but sequential is fine for script
            const vTokenBalance = (await client.readContract({
                address: market,
                abi: VTOKEN_ABI,
                functionName: 'balanceOf',
                args: [USER_ADDRESS as `0x${string}`]
            } as any)) as bigint;

            const borrowBalance = (await client.readContract({
                address: market,
                abi: VTOKEN_ABI,
                functionName: 'borrowBalanceStored',
                args: [USER_ADDRESS as `0x${string}`]
            } as any)) as bigint;

            if (vTokenBalance > BigInt(0) || borrowBalance > BigInt(0)) {
                const symbol = (await client.readContract({
                    address: market,
                    abi: VTOKEN_ABI,
                    functionName: 'symbol'
                } as any)) as string;

                let underlyingDecimals = 18;
                let underlyingSymbol = 'BNB';
                
                if (symbol !== 'vBNB') {
                    try {
                        const underlying = (await client.readContract({
                            address: market,
                            abi: VTOKEN_ABI,
                            functionName: 'underlying'
                        } as any)) as `0x${string}`;
                        
                        underlyingDecimals = (await client.readContract({
                            address: underlying,
                            abi: ERC20_ABI,
                            functionName: 'decimals'
                        } as any)) as number;
                        
                        underlyingSymbol = (await client.readContract({
                            address: underlying,
                            abi: ERC20_ABI,
                            functionName: 'symbol'
                        } as any)) as string;
                    } catch (e) {}
                }

                // Get Price
                let assetPriceUSD = 0;
                if (underlyingSymbol === 'BNB' || underlyingSymbol === 'WBNB') assetPriceUSD = bnbPrice;
                else if (['USDT','USDC','DAI','FDUSD','USDD','BUSD'].includes(underlyingSymbol)) assetPriceUSD = 1;
                else if (underlyingSymbol === 'BTCB' || underlyingSymbol.includes('BTC')) {
                     const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                     const data = await res.json();
                     assetPriceUSD = parseFloat(data.price);
                } else if (underlyingSymbol === 'ETH' || underlyingSymbol.includes('ETH')) {
                     const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
                     const data = await res.json();
                     assetPriceUSD = parseFloat(data.price);
                } else if (underlyingSymbol === 'XRP') {
                     const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT');
                     const data = await res.json();
                     assetPriceUSD = parseFloat(data.price);
                }

                console.log(`\n--- ${symbol} (${underlyingSymbol}) ---`);

                // Supply Logic
                if (vTokenBalance > BigInt(0)) {
                    const exchangeRate = (await client.readContract({
                        address: market,
                        abi: VTOKEN_ABI,
                        functionName: 'exchangeRateStored'
                    } as any)) as bigint;

                    const supplyUnderlyingWei = (vTokenBalance * exchangeRate) / BigInt("1000000000000000000");
                    const supplyUnderlying = parseFloat(formatUnits(supplyUnderlyingWei, underlyingDecimals));
                    const val = supplyUnderlying * assetPriceUSD;
                    
                    totalSupplyUSD += val;
                    console.log(`  Supply: ${supplyUnderlying} ${underlyingSymbol} (~$${val.toFixed(2)})`);
                }

                // Borrow Logic
                if (borrowBalance > BigInt(0)) {
                    // borrowBalanceStored returns amount in UNDERLYING directly
                    const borrowUnderlying = parseFloat(formatUnits(borrowBalance, underlyingDecimals));
                    const val = borrowUnderlying * assetPriceUSD;
                    
                    totalBorrowUSD += val;
                    console.log(`  Borrow: ${borrowUnderlying} ${underlyingSymbol} (~$${val.toFixed(2)})`);
                }
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Total Supplied: $${totalSupplyUSD.toFixed(2)}`);
        console.log(`Total Borrowed: $${totalBorrowUSD.toFixed(2)}`);
        console.log(`Net Worth (Venus): $${(totalSupplyUSD - totalBorrowUSD).toFixed(2)}`);

    } catch (e) {
        console.error(e);
    }
}

main();
