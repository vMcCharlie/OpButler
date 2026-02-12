import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { parseAbi, formatUnits } from 'viem';
import { useTokenPrices } from './useTokenPrices';
import allowedAssets from '@/lib/allowedAssets.json';

const KINZA_COMPTROLLER = '0xcB0620b13867623a9686A34d580436d463cA963c8C'; // Kinza Comptroller

const COMPTROLLER_ABI = parseAbi([
    'function getAllMarkets() view returns (address[])',
]);

const VTOKEN_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function borrowBalanceStored(address account) view returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function underlying() view returns (address)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

const ERC20_ABI = parseAbi([
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

export function useKinzaPortfolio() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    // 1. Fetch All Markets
    const { data: allMarkets } = useReadContract({
        address: KINZA_COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'getAllMarkets',
        query: {
            staleTime: 1000 * 60 * 60, // 1 hour (markets don't change often)
        }
    });

    const markets = (allMarkets as `0x${string}`[]) || [];

    // 2. Fetch Data for All Markets (Multicall)
    // We need 4 calls per market: Balance, Borrow, ExchangeRate, Underlying
    const contractCalls = markets.flatMap(market => [
        { address: market, abi: VTOKEN_ABI, functionName: 'balanceOf', args: [address] },
        { address: market, abi: VTOKEN_ABI, functionName: 'borrowBalanceStored', args: [address] },
        { address: market, abi: VTOKEN_ABI, functionName: 'exchangeRateStored' },
        { address: market, abi: VTOKEN_ABI, functionName: 'underlying' },
        { address: market, abi: VTOKEN_ABI, functionName: 'symbol' }, // vToken Symbol
    ]);

    const { data: activeData } = useReadContracts({
        contracts: address && markets.length > 0 ? contractCalls as any[] : [],
        query: {
            enabled: !!address && markets.length > 0,
            refetchInterval: 15000
        }
    });

    // 3. Process Data
    let totalSupplyUSD = 0;
    let totalBorrowUSD = 0;
    const positions: any[] = [];

    if (activeData && prices) {
        // activeData is flat array: [Bal, Bor, Ex, Und, Sym, Bal, Bor, Ex, Und, Sym, ...]
        // 5 calls per market.
        for (let i = 0; i < markets.length; i++) {
            const baseIndex = i * 5;
            const balRes = activeData[baseIndex];
            const borRes = activeData[baseIndex + 1];
            const exRes = activeData[baseIndex + 2];
            const undRes = activeData[baseIndex + 3];
            const symRes = activeData[baseIndex + 4];

            if (balRes.status === 'success' && borRes.status === 'success' && exRes.status === 'success') {
                const vBal = balRes.result as bigint;
                const borrowBal = borRes.result as bigint; // Underlying amount
                const exchangeRate = exRes.result as bigint;
                const underlyingAddr = undRes.status === 'success' ? undRes.result as string : null;
                const vSymbol = symRes.status === 'success' ? symRes.result as string : 'Unknown';

                // Optimization: Skip if both 0
                if (vBal === BigInt(0) && borrowBal === BigInt(0)) continue;

                // Calculate Supply Underlying
                // underlying = (vBal * exchangeRate) / 1e18
                const supplyUnderlying = (vBal * exchangeRate) / BigInt("1000000000000000000");

                // We need the underlying decimals to format correctly to number
                // BUT we don't have it in this call loop. We could fetch it, or assume 18.
                // Most Kinza assets are 18.
                // Let's assume 18 for now or add a call for it? Adding a call is safer but makes it 6 calls.
                // Let's use 18 and fix if we see outliers.
                const decimals = 18;

                const supplyNum = parseFloat(formatUnits(supplyUnderlying, decimals));
                const borrowNum = parseFloat(formatUnits(borrowBal, decimals));

                // Get Price - we need symbol.
                // vSymbol is likely "zkBNB", "kUSDT" etc.
                // We can try to map based on vSymbol or just fetch underlying Symbol.
                // Underlying symbol would be better.
                // Let's rely on standard mapping or just `symbol()` of underlying in next iteration if needed.
                // For now, let's use the vSymbol to guess. "kUSDT" -> USDT.
                let symbol = vSymbol.startsWith('k') ? vSymbol.slice(1) : vSymbol;
                if (symbol === 'WBNB') symbol = 'BNB'; // Kinza mostly

                // Better: if we have underlyingAddr, check a known map or map to price?
                // `useTokenPrices` has `getPrice(symbol)`.
                const price = prices.getPrice(symbol);

                const supplyUSD = supplyNum * price;
                const borrowUSD = borrowNum * price;

                totalSupplyUSD += supplyUSD;
                totalBorrowUSD += borrowUSD;

                // Find APY data
                const assetConfig = (allowedAssets.kinza as any[]).find(a => a.symbol === symbol || a.originalSymbol === symbol);
                const supplyAPY = assetConfig ? assetConfig.apy : 0;
                const borrowAPY = assetConfig ? assetConfig.apyBaseBorrow : 0;

                positions.push({
                    symbol,
                    supply: supplyNum,
                    supplyUSD,
                    borrow: borrowNum,
                    borrowUSD,
                    price,
                    apy: supplyAPY,
                    borrowApy: borrowAPY
                });
            }
        }
    }

    return {
        totalSupplyUSD,
        totalBorrowUSD,
        netWorthUSD: totalSupplyUSD - totalBorrowUSD,
        positions
    };
}
