import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { parseAbi, formatUnits, getAddress } from 'viem';
import { useTokenPrices } from './useTokenPrices';
import allowedAssets from '@/lib/allowedAssets.json';
import { useMemo } from 'react';

// Radiant Capital V2 (Aave V2 fork) on BNB Chain
// Source: https://docs.radiant.capital/radiant/contracts-and-security/bnb-chain-contracts
// LendingPool resolved from PoolAddressesProvider (0x64A59e3a3A2D15D03E868618261aF12c3deee27c)
const RADIANT_LENDING_POOL = getAddress('0xccf31d54c3a94f67b8ceff8dd771de5846da032c');

// NOTE: The ProtocolDataProvider at 0x2f9D... is INCOMPATIBLE with this pool.
// We use Pool.getReserveData() to get aToken/debtToken addresses, then query balanceOf directly.

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
    'function getReserveData(address asset) view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id)'
]);

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

export function useRadiantPortfolio() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    // 1. Fetch Reserve List
    const { data: reservesList } = useReadContract({
        address: RADIANT_LENDING_POOL,
        abi: POOL_ABI,
        functionName: 'getReservesList',
        query: { staleTime: 1000 * 60 * 60 } // 1 hour
    });

    const reserves = (reservesList as `0x${string}`[]) || [];

    // 2. First multicall: getReserveData for each reserve to discover aToken/debtToken addresses
    //    Plus symbol + decimals of the underlying
    //    4 calls per reserve: getReserveData, symbol, decimals
    const reserveInfoCalls = reserves.flatMap(asset => [
        {
            address: RADIANT_LENDING_POOL,
            abi: POOL_ABI,
            functionName: 'getReserveData',
            args: [asset]
        },
        { address: asset, abi: ERC20_ABI, functionName: 'symbol' },
        { address: asset, abi: ERC20_ABI, functionName: 'decimals' },
    ]);

    const { data: reserveInfoData } = useReadContracts({
        contracts: reserves.length > 0 ? reserveInfoCalls as any[] : [],
        query: {
            enabled: reserves.length > 0,
            staleTime: 1000 * 60 * 60 // 1 hour (aToken addresses don't change)
        }
    });

    // 3. Extract aToken/debtToken addresses, build balance queries
    const tokenAddresses = useMemo(() => {
        if (!reserveInfoData) return [];
        const result: { aToken: `0x${string}`; varDebtToken: `0x${string}`; symbol: string; decimals: number; reserve: `0x${string}` }[] = [];

        for (let i = 0; i < reserves.length; i++) {
            const baseIndex = i * 3;
            const reserveDataRes = reserveInfoData[baseIndex];
            const symRes = reserveInfoData[baseIndex + 1];
            const decRes = reserveInfoData[baseIndex + 2];

            if (reserveDataRes?.status !== 'success') continue;

            const data = reserveDataRes.result as any[];
            // Index 7: aTokenAddress, Index 9: variableDebtTokenAddress
            result.push({
                aToken: data[7] as `0x${string}`,
                varDebtToken: data[9] as `0x${string}`,
                symbol: symRes?.status === 'success' ? (symRes.result as string) : 'Unknown',
                decimals: decRes?.status === 'success' ? (decRes.result as number) : 18,
                reserve: reserves[i]
            });
        }
        return result;
    }, [reserveInfoData, reserves]);

    // 4. Second multicall: balanceOf on aToken and varDebtToken for the user
    const balanceCalls = tokenAddresses.flatMap(t => [
        { address: t.aToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] },
        { address: t.varDebtToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] },
    ]);

    const { data: balanceData, refetch } = useReadContracts({
        contracts: address && tokenAddresses.length > 0 ? balanceCalls as any[] : [],
        query: {
            enabled: !!address && tokenAddresses.length > 0,
            refetchInterval: 15000
        }
    });

    // 5. Process results
    return useMemo(() => {
        let totalSupplyUSD = 0;
        let totalBorrowUSD = 0;
        const positions: any[] = [];

        if (balanceData && prices && tokenAddresses.length > 0) {
            for (let i = 0; i < tokenAddresses.length; i++) {
                const baseIndex = i * 2;
                const aTokenBalRes = balanceData[baseIndex];
                const varDebtBalRes = balanceData[baseIndex + 1];

                const aTokenBal = aTokenBalRes?.status === 'success' ? (aTokenBalRes.result as bigint) : BigInt(0);
                const varDebtBal = varDebtBalRes?.status === 'success' ? (varDebtBalRes.result as bigint) : BigInt(0);

                if (aTokenBal === BigInt(0) && varDebtBal === BigInt(0)) continue;

                const { symbol: rawSymbol, decimals } = tokenAddresses[i];
                let symbol = rawSymbol;
                if (symbol === 'WBNB') symbol = 'BNB';

                const price = prices.getPrice(symbol);

                const supplyNum = parseFloat(formatUnits(aTokenBal, decimals));
                const borrowNum = parseFloat(formatUnits(varDebtBal, decimals));

                const supplyUSD = supplyNum * price;
                const borrowUSD = borrowNum * price;

                totalSupplyUSD += supplyUSD;
                totalBorrowUSD += borrowUSD;

                // Find APY data
                const assetConfig = (allowedAssets.radiant as any[]).find(
                    a => a.symbol === symbol || a.originalSymbol === symbol
                );
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
            isLoading: false,
            refetch
        };
    }, [balanceData, prices, tokenAddresses, refetch]);
}
