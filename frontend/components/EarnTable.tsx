'use client';

import { useMemo, useState } from 'react';
import { useYields, YieldData } from "@/hooks/useYields";
import { AssetIcon } from "@/components/ui/asset-icon";
import { Button } from "@/components/ui/button";
import { ChevronRight, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { EarnModal } from "./EarnModal";
import { formatMoney } from "@/lib/utils";

export function EarnTable() {
    const { data: yields, isLoading } = useYields();
    const [selectedPool, setSelectedPool] = useState<any>(null);

    const earningsData = useMemo(() => {
        if (!yields) return [];

        // Flatten yields into a list of earn opportunities
        // We want to list each pool separately as a "Vault"
        return yields
            .filter(pool => pool.apy > 0) // Only relevant earning pools
            .sort((a, b) => b.tvlUsd - a.tvlUsd); // Sort by TVL default
    }, [yields]);

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
                    <button className="px-4 py-1.5 rounded-full bg-[#1A1A1E] text-white text-sm font-medium border border-emerald-500/20 text-emerald-400">
                        Earn
                    </button>
                    {/* Future filters can go here */}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <LayoutGrid className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                    <List className="w-5 h-5 cursor-pointer text-white" />
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6 md:col-span-4">Vault</div>
                <div className="col-span-3 md:col-span-2 text-right">APY</div>
                <div className="hidden md:block col-span-2 text-right">Deposited</div>
                <div className="hidden md:block col-span-2 text-right">Earnings</div>
                <div className="col-span-3 md:col-span-2 text-right">TVL</div>
            </div>

            {/* Table Body */}
            <div className="space-y-2">
                {earningsData.map((pool) => {
                    // Mapping protocol to icon/name
                    const protocolDisplay =
                        pool.project === 'venus' ? 'Venus' :
                            pool.project === 'kinza-finance' ? 'Kinza' :
                                pool.project === 'radiant-v2' ? 'Radiant' : pool.project;

                    const protocolImg =
                        pool.project === 'venus' ? '/venus.png' :
                            pool.project === 'kinza-finance' ? '/kinza.png' :
                                pool.project === 'radiant-v2' ? '/radiant.jpeg' : null;

                    return (
                        <div key={`${pool.pool}-${pool.project}`} className="group relative bg-[#0f0f12] hover:bg-[#16161a] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300">
                            <div className="grid grid-cols-12 gap-4 px-6 py-5 items-center">
                                {/* Vault */}
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

                                {/* APY */}
                                <div className="col-span-3 md:col-span-2 text-right">
                                    <div className="flex items-center justify-end gap-1.5 font-mono text-emerald-400 font-bold text-sm md:text-base">
                                        <span className="hidden md:inline text-emerald-400">🛡️</span> {/* Placeholder icon for 'safe' or similar from design */}
                                        {pool.apy.toFixed(2)}%
                                    </div>
                                </div>

                                {/* Deposited */}
                                <div className="hidden md:block col-span-2 text-right font-mono text-muted-foreground text-sm">
                                    -
                                </div>

                                {/* Earnings */}
                                <div className="hidden md:block col-span-2 text-right font-mono text-muted-foreground text-sm">
                                    -
                                </div>

                                {/* TVL */}
                                <div className="col-span-3 md:col-span-2 flex items-center justify-between pl-0 md:pl-4">
                                    <div className="flex flex-col items-end flex-1 min-w-0">
                                        <span className="font-bold text-white text-xs md:text-sm max-w-full truncate">{formatMoney(pool.tvlUsd)} <span className="hidden sm:inline">{pool.symbol}</span></span>
                                        <span className="text-[10px] md:text-xs text-muted-foreground">${formatMoney(pool.tvlUsd)}</span>
                                    </div>

                                    <button
                                        onClick={() => setSelectedPool(pool)}
                                        className="ml-2 md:ml-4 flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-500"
                                    >
                                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedPool && (
                <EarnModal
                    isOpen={!!selectedPool}
                    onClose={() => setSelectedPool(null)}
                    pool={selectedPool}
                />
            )}
        </div>
    );
}
