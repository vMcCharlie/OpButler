'use client';

import { useMemo, useState } from 'react';
import { useYields } from "@/hooks/useYields";
import { AssetIcon } from "@/components/ui/asset-icon";
import { ChevronRight, LayoutGrid, List } from 'lucide-react';
import { BorrowModal } from "./BorrowModal";
import { formatMoney, formatTokenAmount } from "@/lib/utils";
import { useVenusPortfolio } from "@/hooks/useVenusPortfolio";
import { useKinzaPortfolio } from "@/hooks/useKinzaPortfolio";
import { useRadiantPortfolio } from "@/hooks/useRadiantPortfolio";

export function BorrowTable() {
    const { data: yields, isLoading } = useYields();
    const [selectedPool, setSelectedPool] = useState<any>(null);

    // Fetch User Portfolios
    const { data: venusPositions = [] } = useVenusPortfolio();
    const { data: kinzaPositions = [] } = useKinzaPortfolio();
    const { data: radiantPositions = [] } = useRadiantPortfolio();

    // Map positions for O(1) lookup: key = `${protocol}-${symbol}`
    const positionMap = useMemo(() => {
        const map = new Map<string, any>();

        const addPosition = (key: string, pos: any) => {
            if (map.has(key)) {
                const existing = map.get(key);
                existing.supply += pos.supply;
                existing.supplyUSD += pos.supplyUSD;
                existing.borrow += pos.borrow;
                existing.borrowUSD += pos.borrowUSD;
            } else {
                map.set(key, { ...pos });
            }
        };

        venusPositions.forEach((pos: any) => {
            addPosition(`venus-${pos.symbol}`.toUpperCase(), pos);
        });
        kinzaPositions.forEach((pos: any) => {
            addPosition(`kinza-finance-${pos.symbol}`.toUpperCase(), pos);
        });
        radiantPositions.forEach((pos: any) => {
            addPosition(`radiant-v2-${pos.symbol}`.toUpperCase(), pos);
        });

        return map;
    }, [venusPositions, kinzaPositions, radiantPositions]);

    const borrowData = useMemo(() => {
        if (!yields) return [];

        // Filter for pools that calculate borrowing data nicely
        // and sort by Liquidity (Available to Borrow)
        // Group by Symbol for display logic if needed, but simple sort is fine for now
        return yields
            .filter(pool => (pool.totalSupplyUsd || 0) > 0)
            .sort((a, b) => {
                // Primary Sort: User Debt Descending
                const keyA = `${a.project}-${a.symbol}`.toUpperCase();
                const keyB = `${b.project}-${b.symbol}`.toUpperCase();
                const posA = positionMap.get(keyA);
                const posB = positionMap.get(keyB);
                const debtA = posA?.borrowUSD || 0;
                const debtB = posB?.borrowUSD || 0;

                if (debtA !== debtB) return debtB - debtA;

                // Secondary Sort: Available Liquidity
                const availableA = (a.totalSupplyUsd || 0) - (a.totalBorrowUsd || 0);
                const availableB = (b.totalSupplyUsd || 0) - (b.totalBorrowUsd || 0);
                return availableB - availableA;
            });
    }, [yields, positionMap]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-muted/10 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button className="px-4 py-1.5 rounded-full bg-[#1A1A1E] text-white text-sm font-medium border border-blue-500/20 text-blue-400">
                        Borrow
                    </button>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <LayoutGrid className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                    <List className="w-5 h-5 cursor-pointer text-white" />
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6 md:col-span-4">Asset</div>
                <div className="col-span-3 md:col-span-2 text-right">Borrow APY</div>
                <div className="hidden md:block col-span-2 text-right">Max LTV</div>
                <div className="hidden md:block col-span-2 text-right">Liquidity</div>
                <div className="col-span-3 md:col-span-2 text-right">Your Debt</div>
            </div>

            {/* Table Body */}
            <div className="space-y-2">
                {borrowData.map((pool) => {
                    const projectKey = pool.project; // Already aggregated to 'venus' if applicable by useYields
                    const protocolDisplay =
                        projectKey === 'venus' ? 'Venus' :
                            projectKey === 'kinza-finance' ? 'Kinza' :
                                projectKey === 'radiant-v2' ? 'Radiant' : projectKey;

                    const protocolImg =
                        projectKey === 'venus' ? '/venus.png' :
                            projectKey === 'kinza-finance' ? '/kinza.png' :
                                projectKey === 'radiant-v2' ? '/radiant.jpeg' : null;

                    // Calculate metrics
                    const availableLiquidity = (pool.totalSupplyUsd || 0) - (pool.totalBorrowUsd || 0);
                    const borrowApy = (pool.apyBaseBorrow || 0) + (pool.apyRewardBorrow || 0);
                    const ltvDisplay = pool.ltv ? `${(pool.ltv * 100).toFixed(0)}%` : '-';

                    // Fetched Position
                    const positionKey = `${projectKey}-${pool.symbol}`.toUpperCase();
                    const position = positionMap.get(positionKey);
                    const borrowedAmount = position?.borrow || 0;
                    const borrowedUSD = position?.borrowUSD || 0;

                    const isInteractable = true; // All are interactable conceptually

                    return (
                        <div
                            key={`${pool.pool}-${pool.project}`}
                            onClick={() => setSelectedPool(pool)}
                            className="group relative bg-[#0f0f12] hover:bg-[#16161a] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer"
                        >
                            <div className="grid grid-cols-12 gap-4 px-6 py-5 items-center">
                                {/* Asset */}
                                <div className="col-span-6 md:col-span-4 flex items-center gap-4">
                                    <div className="relative flex-shrink-0">
                                        <AssetIcon symbol={pool.symbol} className="w-8 h-8 md:w-10 md:h-10" />
                                        {protocolImg && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-[#0f0f12] bg-white overflow-hidden">
                                                <img src={protocolImg} className="w-full h-full object-cover" alt={protocolDisplay} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-white text-sm md:text-base truncate">{pool.symbol}</span>
                                        <span className="text-[10px] md:text-xs text-muted-foreground truncate">{protocolDisplay}</span>
                                    </div>
                                </div>

                                {/* Borrow APY */}
                                <div className="col-span-3 md:col-span-2 text-right">
                                    <div className="flex items-center justify-end gap-1.5 font-mono text-blue-400 font-bold text-sm md:text-base">
                                        {borrowApy > 0 ? `-${borrowApy.toFixed(2)}%` : '0%'}
                                    </div>
                                </div>

                                {/* Max LTV */}
                                <div className="hidden md:block col-span-2 text-right font-mono text-white text-sm">
                                    {ltvDisplay}
                                </div>

                                {/* Liquidity */}
                                <div className="hidden md:block col-span-2 text-right font-mono text-emerald-400 text-sm">
                                    ${formatMoney(availableLiquidity)}
                                </div>

                                {/* Your Debt */}
                                <div className="col-span-3 md:col-span-2 flex items-center justify-between pl-0 md:pl-4">
                                    <div className="flex flex-col items-end flex-1 min-w-0">
                                        <span className="font-bold text-white text-xs md:text-sm max-w-full truncate">
                                            {borrowedAmount > 0
                                                ? `${formatTokenAmount(borrowedAmount)} ${pool.symbol}`
                                                : '-'}
                                        </span>
                                        <span className="text-[10px] md:text-xs text-muted-foreground">
                                            {borrowedUSD > 0 ? formatMoney(borrowedUSD) : '$0.00'}
                                        </span>
                                    </div>
                                    <div className="ml-2 md:ml-4 flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors group-hover:border-blue-500/50 group-hover:text-blue-500">
                                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedPool && (
                <BorrowModal
                    isOpen={!!selectedPool}
                    onClose={() => setSelectedPool(null)}
                    pool={selectedPool}
                />
            )}
        </div>
    );
}
