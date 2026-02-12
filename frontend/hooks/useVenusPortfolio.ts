import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import { formatUnits, parseAbi } from 'viem';
import { VENUS_COMPTROLLER } from '@/lib/pool-config';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import allowedAssets from '@/lib/allowedAssets.json';

const COMPTROLLER_ABI = parseAbi([
    'function getAllMarkets() view returns (address[])',
]);

const VTOKEN_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function borrowBalanceStored(address account) view returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function underlying() view returns (address)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
]);

const ERC20_ABI = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
]);

export function useVenusPortfolio() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    // 1. Fetch All Markets from Comptroller
    const { data: allMarkets } = useReadContract({
        address: VENUS_COMPTROLLER as `0x${string}`,
        abi: COMPTROLLER_ABI,
        functionName: 'getAllMarkets',
        query: {
            staleTime: 1000 * 60 * 60, // 1 hour
        }
    });

    const markets = (allMarkets as `0x${string}`[]) || [];

    // 2. Multicall for User Data
    // For each market: Balance, Borrow, ExchangeRate, Underlying, Symbol, Decimals(optional if standard)
    // We also need decimals of underlying to format correctly.
    const contractCalls = markets.flatMap(market => [
        { address: market, abi: VTOKEN_ABI, functionName: 'balanceOf', args: [address] },
        { address: market, abi: VTOKEN_ABI, functionName: 'borrowBalanceStored', args: [address] },
        { address: market, abi: VTOKEN_ABI, functionName: 'exchangeRateStored' },
        { address: market, abi: VTOKEN_ABI, functionName: 'underlying' },
        { address: market, abi: VTOKEN_ABI, functionName: 'symbol' },
    ]);

    const { data: activeData } = useReadContracts({
        contracts: address && markets.length > 0 ? contractCalls as any[] : [],
        query: {
            enabled: !!address && markets.length > 0,
            refetchInterval: 15000
        }
    });

    // 3. Process Data
    return useMemo(() => {
        if (!activeData || !prices || !address) return {
            totalSupplyUSD: 0,
            totalBorrowUSD: 0,
            netWorthUSD: 0,
            positions: [],
            isLoading: true
        };

        let totalSupplyUSD = 0;
        let totalBorrowUSD = 0;
        const positions: any[] = [];

        // 5 calls per market
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
                const vSymbol = symRes.status === 'success' ? (symRes.result as string) : '';

                // Skip if no balance and no borrow
                if (vBal === BigInt(0) && borrowBal === BigInt(0)) continue;

                // Determine Asset Symbol
                // vBNB doesn't have underlying() usually, returns 0x0... or reverts?
                // Actually vBNB has underlying() on some chains, but on Venus it might not.
                // If symbol is vBNB, we know it's BNB.
                let symbol = vSymbol.startsWith('v') ? vSymbol.slice(1) : vSymbol;
                if (symbol === 'WBNB') symbol = 'BNB';

                // Decimals
                // Most underlying on BSC are 18. USDC/USDT are 18 on BSC.
                // We can assume 18 for now.
                const decimals = 18;

                // Supply in Underlying
                // underlying = (vBal * exchangeRate) / 1e18
                const supplyUnderlyingWei = (vBal * exchangeRate) / BigInt("1000000000000000000");
                const supplyNum = parseFloat(formatUnits(supplyUnderlyingWei, decimals));

                // Borrow in Underlying
                const borrowNum = parseFloat(formatUnits(borrowBal, decimals));

                // Price
                const price = prices.getPrice(symbol);

                const supplyUSD = supplyNum * price;
                const borrowUSD = borrowNum * price;

                totalSupplyUSD += supplyUSD;
                totalBorrowUSD += borrowUSD;

                // Find APY data
                // Try exact match, then v-stripped match
                let assetConfig = (allowedAssets.venus as any[]).find(a => a.symbol === symbol || a.originalSymbol === symbol);

                // If not found, try to look up by underlying symbol (handled by logic above partially)
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

        return {
            totalSupplyUSD,
            totalBorrowUSD,
            netWorthUSD: totalSupplyUSD - totalBorrowUSD,
            positions,
            isLoading: false
        };

    }, [activeData, prices, address, markets]);
}
