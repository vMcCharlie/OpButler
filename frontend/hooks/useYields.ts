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

export function useYields() {
    return useQuery({
        queryKey: ['yields'],
        queryFn: fetchYields,
        select: (data) => {
            // Filter for BSC and specific projects
            return data.filter(pool => {
                const isBSC = pool.chain === 'BSC';
                const isProject =
                    pool.project === 'venus-core-pool' ||
                    pool.project === 'venus-isolated-pool' ||
                    pool.project === 'venus' ||
                    pool.project === 'kinza-finance' ||
                    pool.project === 'radiant-v2';

                // We do NOT filter by asset symbol anymore. We want ALL assets.
                // Just exclude very low TVL dust if needed? 
                // Let's filter minimal TVL to avoid noise (e.g. < $10k)
                const isViable = pool.tvlUsd > 10000;

                return isBSC && isProject && isViable;
            }).map(pool => ({
                ...pool,
                symbol: NORMALIZE_SYMBOL[pool.symbol] || pool.symbol,
                project: pool.project.includes('venus') ? 'venus' : pool.project,
                // Fallback Estimation for visual demo purposes if API doesn't provide it
                apyBaseBorrow: pool.apyBaseBorrow || (pool.apyBase ? pool.apyBase * 1.5 : 0),
                apyRewardBorrow: pool.apyRewardBorrow || 0,
                totalSupplyUsd: pool.totalSupplyUsd || pool.tvlUsd,
                // Estimate Borrowed amount from TVL if missing (assuming ~40% utilization of supplied capital)
                totalBorrowUsd: pool.totalBorrowUsd || (pool.tvlUsd ? pool.tvlUsd * 0.4 : 0)
            }));
        },
    });
}
