import { useQuery } from '@tanstack/react-query';

const DEFILLAMA_API = 'https://yields.llama.fi/pools';

export interface YieldData {
    chain: string;
    project: string;
    symbol: string;
    tvlUsd: number;
    apy: number;
    apyBase: number;
    apyReward: number;
    apyBaseBorrow?: number;
    apyRewardBorrow?: number;
    totalSupplyUsd?: number;
    totalBorrowUsd?: number;
    ltv?: number;
    pool: string;
    underlyingTokens?: string[];
}

// Minimal normalization
const NORMALIZE_SYMBOL: Record<string, string> = {
    'WBNB': 'BNB',
    // 'BTCB': 'BTC', // Keep BTCB as BTCB
    // 'WBTC': 'BTC'
};

async function fetchYields() {
    const response = await fetch(DEFILLAMA_API);
    const data = await response.json();
    return data.data as YieldData[];
}

import allowedAssets from '@/lib/allowedAssets.json';

// Create a Set of allowed pool IDs for O(1) lookup
const ALLOWED_POOL_IDS = new Set<string>();
Object.values(allowedAssets).forEach((assets: any[]) => {
    assets.forEach(asset => ALLOWED_POOL_IDS.add(asset.poolId));
});

export function useYields() {
    return useQuery({
        queryKey: ['yields'],
        queryFn: fetchYields,
        select: (data) => {
            // Filter for BSC and specific projects AND allowed pool IDs
            // 1. Filter relevant pools
            const filtered = data.filter(pool => {
                const isBSC = pool.chain === 'BSC';
                const isProject =
                    pool.project === 'venus' ||
                    pool.project === 'venus-core-pool' ||
                    pool.project === 'kinza-finance' ||
                    pool.project === 'radiant-v2';

                // Exclude Venus Isolated Pools as they are closing
                const isIsolated = pool.project === 'venus-isolated-pool';

                // Check if the pool is in our allowed list
                const isAllowed = ALLOWED_POOL_IDS.has(pool.pool);

                return isBSC && isProject && !isIsolated && isAllowed;
            });

            // 2. Aggregate Duplicates (Same Project + Symbol)
            // Key: `${project}-${symbol}`
            const aggregatedMap = new Map<string, any>();

            filtered.forEach(pool => {
                const symbol = NORMALIZE_SYMBOL[pool.symbol] || pool.symbol;
                const project = pool.project.includes('venus') ? 'venus' : pool.project;
                const key = `${project}-${symbol}`;

                if (aggregatedMap.has(key)) {
                    const existing = aggregatedMap.get(key);

                    // Weighted Average APY calculation
                    const totalTvl = existing.tvlUsd + pool.tvlUsd;
                    const weightedApy = totalTvl > 0
                        ? (existing.apy * existing.tvlUsd + pool.apy * pool.tvlUsd) / totalTvl
                        : existing.apy;

                    // Update existing entry
                    existing.tvlUsd += pool.tvlUsd;
                    existing.totalSupplyUsd = (existing.totalSupplyUsd || 0) + (pool.totalSupplyUsd || pool.tvlUsd);
                    existing.totalBorrowUsd = (existing.totalBorrowUsd || 0) + (pool.totalBorrowUsd || ((pool.tvlUsd || 0) * 0.4));
                    existing.apy = weightedApy;

                    // Keep max LTV if different (safer to show what's possible, or min? Lets stick to first found for now or max)
                    existing.ltv = Math.max(existing.ltv || 0, pool.ltv || 0);

                } else {
                    // Initialize new entry
                    let fallbackLtv = 0.6;
                    const symbolUpper = symbol.toUpperCase();
                    if (['USDT', 'USDC', 'FDUSD', 'DAI', 'BUSD'].includes(symbolUpper)) {
                        fallbackLtv = 0.8;
                    } else if (['BNB', 'WBNB', 'ETH', 'WETH', 'BTC', 'BTCB', 'WBTC', 'SOLVBTC'].includes(symbolUpper)) {
                        fallbackLtv = 0.75;
                    }

                    aggregatedMap.set(key, {
                        ...pool,
                        symbol,
                        project,
                        tvlUsd: pool.tvlUsd,
                        apy: pool.apy,
                        apyBaseBorrow: pool.apyBaseBorrow || (pool.apyBase ? pool.apyBase * 1.5 : 0),
                        apyRewardBorrow: pool.apyRewardBorrow || 0,
                        totalSupplyUsd: pool.totalSupplyUsd || pool.tvlUsd,
                        totalBorrowUsd: pool.totalBorrowUsd || (pool.tvlUsd ? pool.tvlUsd * 0.4 : 0),
                        ltv: pool.ltv || fallbackLtv
                    });
                }
            });

            return Array.from(aggregatedMap.values());
        },
    });
}
