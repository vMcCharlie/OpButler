import { useReadContracts, useAccount } from 'wagmi';
import { useMemo } from 'react';
import { formatUnits, parseAbi } from 'viem';
import { VENUS_VTOKENS, VTOKEN_ABI } from '@/lib/pool-config';
import { useTokenPrices } from '@/hooks/useTokenPrices';

// Underlying Decimals Mapping (Manual for now, ideal would be to fetch)
const DECIMALS: Record<string, number> = {
    'BNB': 18,
    'WBNB': 18,
    'BTCB': 18, // BTCB is 18
    'ETH': 18,
    'USDT': 18, // USDT on BSC is 18
    'USDC': 18, // USDC on BSC is 18
    'XRP': 18, // XRP on BSC (BEP20) is 18
    // Add others as needed
};

export function useVenusPortfolio() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    // Prepare contract calls for all supported Venus Tokens
    const vTokenSymbols = Object.keys(VENUS_VTOKENS);
    const contracts: any[] = [];

    vTokenSymbols.forEach(symbol => {
        const vTokenAddress = VENUS_VTOKENS[symbol];
        if (!vTokenAddress) return;

        // 1. Balance of vToken (User's supply in vTokens)
        contracts.push({
            address: vTokenAddress,
            abi: VTOKEN_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
        });

        // 2. Borrow Balance Current (User's borrow in Underlying)
        // Note: borrowBalanceStored is view, borrowBalanceCurrent updates state but is not view.
        // We use borrowBalanceStored for reading without transaction.
        contracts.push({
            address: vTokenAddress,
            abi: VTOKEN_ABI,
            functionName: 'borrowBalanceStored',
            args: [address as `0x${string}`]
        });

        // 3. Exchange Rate (vToken -> Underlying)
        contracts.push({
            address: vTokenAddress,
            abi: VTOKEN_ABI,
            functionName: 'exchangeRateStored',
        });
    });

    const { data: results, isLoading, refetch } = useReadContracts({
        contracts,
        query: {
            enabled: !!address,
            refetchInterval: 10_000,
        }
    });

    return useMemo(() => {
        if (!results || !prices || !address) return {
            totalSupplyUSD: 0,
            totalBorrowUSD: 0,
            netWorthUSD: 0,
            positions: [],
            isLoading: true,
            refetch
        };

        let totalSupplyUSD = 0;
        let totalBorrowUSD = 0;
        const positions = [];

        // Iterate by chunks of 3 calls per token
        for (let i = 0; i < vTokenSymbols.length; i++) {
            const symbol = vTokenSymbols[i];
            const baseIdx = i * 3;

            const balRes = results[baseIdx];
            const borrowRes = results[baseIdx + 1];
            const exchRes = results[baseIdx + 2];

            if (balRes.status === 'success' && borrowRes.status === 'success' && exchRes.status === 'success') {
                const vTokenBal = balRes.result as bigint;
                const borrowBal = borrowRes.result as bigint;
                const exchangeRate = exchRes.result as bigint; // Scaled by 1e18 usually, but depends on decimals

                // Venus Exchange Rate Logic:
                // Exchange Rate = (Total Cash + Total Borrows - Total Reserves) / Total Supply
                // It is scaled by 1e18 + (underlyingDecimals - vTokenDecimals).
                // vTokens have 8 decimals.
                // Underlying (e.g. BNB) has 18.
                // Scaling = 10^(18 + 18 - 8) = 1e28.
                // So ExchangeRate is a big number.

                const underlyingDecimals = DECIMALS[symbol] || 18;
                const vTokenDecimals = 8; // Venus vTokens are always 8 decimals

                // Calculate Supply in Underlying
                // Supply = (vTokenBal * exchangeRate) / 1e18
                // Wait, precise math:
                // mantissa = 18 + underlyingDecimals - vTokenDecimals
                const mantissa = 18 + underlyingDecimals - vTokenDecimals;

                // User Supply (Underlying) = (vTokenBal * exchangeRate) / 10^mantissa
                const supplyUnderlying = (Number(vTokenBal) * Number(exchangeRate)) / Math.pow(10, mantissa);

                // Borrow Balance is already in Underlying
                const borrowUnderlying = Number(formatUnits(borrowBal, underlyingDecimals));

                // Price
                const price = prices.getPrice(symbol);

                const supplyUSD = supplyUnderlying * price;
                const borrowUSD = borrowUnderlying * price;

                if (supplyUSD > 0.01 || borrowUSD > 0.01) {
                    positions.push({
                        symbol,
                        supplyUnderlying,
                        borrowUnderlying,
                        supplyUSD,
                        borrowUSD,
                        price
                    });
                }

                totalSupplyUSD += supplyUSD;
                totalBorrowUSD += borrowUSD;
            }
        }

        return {
            totalSupplyUSD,
            totalBorrowUSD,
            netWorthUSD: totalSupplyUSD - totalBorrowUSD,
            positions,
            isLoading: false,
            refetch
        };

    }, [results, prices, address]);
}
