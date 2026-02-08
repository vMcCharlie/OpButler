'use client';

import { useMemo } from 'react';
import { useYields, YieldData } from './useYields';

// Asset categories for safety scoring
const STABLECOINS = ['USDT', 'USDC', 'FDUSD', 'DAI', 'BUSD', 'TUSD'];
const MAJOR_CRYPTO = ['BNB', 'WBNB', 'ETH', 'WETH', 'BTC', 'BTCB', 'WBTC'];

export interface SmartLoop {
    id: string;
    supplyAsset: string;
    borrowAsset: string;
    protocol: string;
    protocolDisplay: string;
    netApy: number;
    supplyApy: number;
    borrowApy: number;
    maxLeverage: number;
    leveragedApy: number;
    safetyScore: number;
    risk: 'Low' | 'Medium' | 'High';
    isStable: boolean;
    tvlUsd: number;
    pair: string;
}

// Protocol display names
const PROTOCOL_DISPLAY: Record<string, string> = {
    'venus': 'Venus',
    'venus-core-pool': 'Venus',
    'venus-isolated-pool': 'Venus',
    'kinza-finance': 'Kinza',
    'radiant-v2': 'Radiant'
};

/**
 * Calculate safety score for an asset (0-100)
 */
function getAssetSafetyScore(symbol: string, tvl: number): number {
    const symbolUpper = symbol.toUpperCase();

    // Base volatility score
    let volatilityScore = 50; // Default for altcoins
    if (STABLECOINS.includes(symbolUpper)) {
        volatilityScore = 100;
    } else if (MAJOR_CRYPTO.includes(symbolUpper)) {
        volatilityScore = 80;
    }

    // TVL score (0-100, scaled logarithmically)
    // $100k = 20, $1M = 50, $10M = 80, $100M = 100
    let tvlScore = 0;
    if (tvl > 0) {
        tvlScore = Math.min(100, Math.log10(tvl / 10000) * 25);
    }

    // Combined score
    return Math.round(volatilityScore * 0.6 + tvlScore * 0.4);
}

/**
 * Determine risk level from safety score
 */
function getRiskLevel(safetyScore: number): 'Low' | 'Medium' | 'High' {
    if (safetyScore >= 75) return 'Low';
    if (safetyScore >= 50) return 'Medium';
    return 'High';
}

/**
 * Check if both assets are stablecoins
 */
function isStablePair(supply: string, borrow: string): boolean {
    return STABLECOINS.includes(supply.toUpperCase()) &&
        STABLECOINS.includes(borrow.toUpperCase());
}

/**
 * Calculate max leverage from LTV
 * MaxLev = 1 / (1 - LTV)
 */
function getMaxLeverage(ltv: number): number {
    if (ltv >= 1) return 1;
    return Math.min(10, 1 / (1 - ltv));
}

/**
 * Calculate leveraged APY
 * LeveragedAPY = SupplyAPY * leverage - BorrowAPY * (leverage - 1)
 */
function getLeveragedApy(supplyApy: number, borrowApy: number, leverage: number): number {
    return supplyApy * leverage - borrowApy * (leverage - 1);
}

export function useSmartLoops() {
    const { data: yields, isLoading, error } = useYields();

    const smartLoops = useMemo(() => {
        if (!yields || yields.length === 0) return [];

        const loops: SmartLoop[] = [];
        const processedPairs = new Set<string>();

        // Group yields by project for same-protocol loops
        const yieldsByProject: Record<string, YieldData[]> = {};
        yields.forEach(y => {
            const project = y.project.includes('venus') ? 'venus' : y.project;
            if (!yieldsByProject[project]) yieldsByProject[project] = [];
            yieldsByProject[project].push(y);
        });

        // For each project, find optimal supply/borrow pairs
        Object.entries(yieldsByProject).forEach(([project, projectYields]) => {
            // Sort by supply APY descending for supply candidates
            const sortedBySupply = [...projectYields].sort((a, b) => b.apy - a.apy);

            // Sort by borrow APY ascending for borrow candidates
            const sortedByBorrow = [...projectYields].sort((a, b) =>
                (a.apyBaseBorrow || 0) - (b.apyBaseBorrow || 0)
            );

            // Generate pairs: each high-supply with low-borrow
            // Limit to top 5 supply and top 5 borrow to avoid explosion
            const topSupply = sortedBySupply.slice(0, 8);
            const topBorrow = sortedByBorrow.slice(0, 8);

            topSupply.forEach(supply => {
                topBorrow.forEach(borrow => {
                    const pairKey = `${project}-${supply.symbol}-${borrow.symbol}`;
                    if (processedPairs.has(pairKey)) return;
                    processedPairs.add(pairKey);

                    const supplyApy = supply.apy || 0;
                    const borrowApy = borrow.apyBaseBorrow || 0;
                    const netApy = supplyApy - borrowApy;

                    // Skip if net APY is negative (unprofitable)
                    if (netApy < 0) return;

                    // Calculate safety based on the riskier asset
                    const supplySafety = getAssetSafetyScore(supply.symbol, supply.tvlUsd);
                    const borrowSafety = getAssetSafetyScore(borrow.symbol, borrow.tvlUsd);
                    const combinedSafety = Math.min(supplySafety, borrowSafety);

                    // Skip very low safety altcoins with low TVL
                    if (combinedSafety < 30 && Math.min(supply.tvlUsd, borrow.tvlUsd) < 100000) return;

                    const ltv = supply.ltv || 0.75;
                    const maxLev = getMaxLeverage(ltv);
                    const leveragedApy = getLeveragedApy(supplyApy, borrowApy, maxLev);

                    // Skip same asset pairs with low APY
                    if (supply.symbol === borrow.symbol && leveragedApy < 5) return;

                    loops.push({
                        id: pairKey,
                        supplyAsset: supply.symbol,
                        borrowAsset: borrow.symbol,
                        protocol: project,
                        protocolDisplay: PROTOCOL_DISPLAY[project] || project,
                        netApy,
                        supplyApy,
                        borrowApy,
                        maxLeverage: Math.round(maxLev * 10) / 10,
                        leveragedApy: Math.round(leveragedApy * 10) / 10,
                        safetyScore: combinedSafety,
                        risk: getRiskLevel(combinedSafety),
                        isStable: isStablePair(supply.symbol, borrow.symbol),
                        tvlUsd: Math.min(supply.tvlUsd, borrow.tvlUsd),
                        pair: `${supply.symbol} / ${borrow.symbol}`
                    });
                });
            });
        });

        // Sort by a combined score: leveraged APY * safety factor
        // This prioritizes high yields but penalizes risky pairs
        return loops.sort((a, b) => {
            const scoreA = a.leveragedApy * (a.safetyScore / 100);
            const scoreB = b.leveragedApy * (b.safetyScore / 100);
            return scoreB - scoreA;
        });

    }, [yields]);

    // Filter functions
    const getTopLoops = (count = 5) => smartLoops.slice(0, count);

    const getStableLoops = () => smartLoops.filter(l => l.isStable);

    const getSafeLoops = () => smartLoops.filter(l => l.risk === 'Low');

    const getByProtocol = (protocol: string) =>
        smartLoops.filter(l => l.protocol.toLowerCase().includes(protocol.toLowerCase()));

    return {
        loops: smartLoops,
        isLoading,
        error,
        getTopLoops,
        getStableLoops,
        getSafeLoops,
        getByProtocol
    };
}
