import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { parseAbi, formatUnits, getAddress } from 'viem';
import { useTokenPrices } from './useTokenPrices';
import allowedAssets from '@/lib/allowedAssets.json';
import { useMemo } from 'react';

// Kinza is an Aave V3 fork — use Pool + PoolDataProvider, NOT Comptroller
// Source: https://docs.kinza.finance/resources/deployed-contracts/bnb-chain
const KINZA_POOL = getAddress('0xcb0620b181140e57d1c0d8b724cde623ca963c8c');
const KINZA_DATA_PROVIDER = getAddress('0x09ddc4ae826601b0f9671b9edffdf75e7e6f5d61');

const POOL_ABI = parseAbi([
    'function getReservesList() view returns (address[])',
]);

const DATA_PROVIDER_ABI = parseAbi([
    'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebtBalance, uint256 currentVariableDebtBalance, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usedAsCollateralEnabled)'
]);

const ERC20_ABI = parseAbi([
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
]);

export function useKinzaPortfolio() {
    const { address } = useAccount();
    const { data: prices } = useTokenPrices();

    // 1. Fetch All Reserves from Pool
    const { data: allReserves } = useReadContract({
        address: KINZA_POOL,
        abi: POOL_ABI,
        functionName: 'getReservesList',
        query: {
            staleTime: 1000 * 60 * 60, // 1 hour
        }
    });

    const reserves = (allReserves as `0x${string}`[]) || [];

    // 2. Build multicall: for each reserve, fetch getUserReserveData + symbol + decimals
    // 3 calls per reserve: getUserReserveData, symbol, decimals
    const contractCalls = reserves.flatMap(reserve => [
        {
            address: KINZA_DATA_PROVIDER,
            abi: DATA_PROVIDER_ABI,
            functionName: 'getUserReserveData',
            args: [reserve, address]
        },
        { address: reserve, abi: ERC20_ABI, functionName: 'symbol' },
        { address: reserve, abi: ERC20_ABI, functionName: 'decimals' },
    ]);

    const { data: activeData } = useReadContracts({
        contracts: address && reserves.length > 0 ? contractCalls as any[] : [],
        query: {
            enabled: !!address && reserves.length > 0,
            refetchInterval: 15000
        }
    });

    // 3. Process Data
    return useMemo(() => {
        let totalSupplyUSD = 0;
        let totalBorrowUSD = 0;
        const positions: any[] = [];

        if (activeData && prices) {
            // activeData is flat: [UserReserveData, Symbol, Decimals, UserReserveData, Symbol, Decimals, ...]
            // 3 calls per reserve
            for (let i = 0; i < reserves.length; i++) {
                const baseIndex = i * 3;
                const reserveDataRes = activeData[baseIndex];
                const symbolRes = activeData[baseIndex + 1];
                const decimalsRes = activeData[baseIndex + 2];

                if (reserveDataRes?.status !== 'success') continue;

                const reserveData = reserveDataRes.result as any[];
                // Index 0: currentATokenBalance (supply)
                // Index 1: currentStableDebtBalance
                // Index 2: currentVariableDebtBalance
                const aTokenBalance = reserveData[0] as bigint;
                const stableDebt = reserveData[1] as bigint;
                const variableDebt = reserveData[2] as bigint;

                // Skip if no positions
                if (aTokenBalance === BigInt(0) && stableDebt === BigInt(0) && variableDebt === BigInt(0)) continue;

                let symbol = symbolRes?.status === 'success' ? symbolRes.result as string : 'Unknown';
                const decimals = decimalsRes?.status === 'success' ? decimalsRes.result as number : 18;

                // Normalize symbol for price lookup
                if (symbol === 'WBNB') symbol = 'BNB';

                const price = prices.getPrice(symbol);

                const supplyNum = parseFloat(formatUnits(aTokenBalance, decimals));
                const borrowNum = parseFloat(formatUnits(variableDebt + stableDebt, decimals));

                const supplyUSD = supplyNum * price;
                const borrowUSD = borrowNum * price;

                totalSupplyUSD += supplyUSD;
                totalBorrowUSD += borrowUSD;

                // Find APY data from allowedAssets
                const assetConfig = (allowedAssets.kinza as any[]).find(
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
            isLoading: false
        };
    }, [activeData, prices, reserves]);
}
