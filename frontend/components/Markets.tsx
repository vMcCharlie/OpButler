'use client';

import { useState, useMemo } from 'react';
import { useYields } from "@/hooks/useYields";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/ui/asset-icon";
import Link from 'next/link';

export function Markets() {
    const { data: yields, isLoading } = useYields();
    const [sortBy, setSortBy] = useState<'tvl' | 'apy'>('tvl');

    // Process data into a map: Symbol -> { protocols: ..., totalTVL: ..., maxAPY: ... }
    const marketData = useMemo(() => {
        if (!yields) return [];

        const map: Record<string, {
            symbol: string;
            venus?: { s: number, b: number, tvl: number };
            kinza?: { s: number, b: number, tvl: number };
            radiant?: { s: number, b: number, tvl: number };
            totalSupplied: number;
            totalBorrowed: number;
            maxAPY: number;
        }> = {};

        yields.forEach(pool => {
            const symbol = pool.symbol;
            if (!map[symbol]) {
                map[symbol] = { symbol, totalSupplied: 0, totalBorrowed: 0, maxAPY: 0 };
            }

            const data = { s: pool.apy, b: pool.apyBaseBorrow || 0, tvl: pool.tvlUsd };
            const entry = map[symbol];

            // Update Protocol Data
            if (pool.project === 'venus') entry.venus = data;
            if (pool.project === 'kinza-finance') entry.kinza = data;
            if (pool.project === 'radiant-v2') entry.radiant = data;

            // Update Aggregates
            // Use totalSupplyUsd if available, else tvlUsd. For borrowed, use totalBorrowUsd.
            const supply = pool.totalSupplyUsd || pool.tvlUsd;
            const borrow = pool.totalBorrowUsd || 0;

            entry.totalSupplied += supply;
            entry.totalBorrowed += borrow;

            if (pool.apy > entry.maxAPY) entry.maxAPY = pool.apy;
        });

        // Convert to array and sort
        const arr = Object.values(map);
        return arr.sort((a, b) => {
            if (sortBy === 'tvl') return b.totalSupplied - a.totalSupplied;
            if (sortBy === 'apy') return b.maxAPY - a.maxAPY;
            return 0;
        });

    }, [yields, sortBy]);

    if (isLoading) {
        return (
            <Card className="col-span-full border border-border bg-card">
                <CardHeader>
                    <CardTitle>Global Markets</CardTitle>
                    <CardDescription>Scanning Venus, Kinza, Radiant...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center animate-pulse text-primary/50">
                        Loading live yields...
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatMoney = (num: number) => {
        if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
        return `$${num.toFixed(0)}`;
    };

    return (
        <Card className="col-span-full border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Market Opportunities</CardTitle>
                    <CardDescription>Real-time lending & borrowing rates across BSC ecosystem.</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setSortBy('tvl')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${sortBy === 'tvl' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Highest TVL
                    </button>
                    <button
                        onClick={() => setSortBy('apy')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${sortBy === 'apy' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Highest APY
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                                <th className="h-12 px-4 align-middle font-medium min-w-[220px]">Asset</th>
                                <th className="h-12 px-4 align-middle font-medium text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full overflow-hidden bg-white">
                                            <img src="/venus.png" className="w-full h-full object-cover" alt="Venus" />
                                        </div>
                                        Venus
                                    </div>
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full overflow-hidden bg-white">
                                            <img src="/kinza.png" className="w-full h-full object-cover" alt="Kinza" />
                                        </div>
                                        Kinza
                                    </div>
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full overflow-hidden bg-white">
                                            <img src="/radiant.jpeg" className="w-full h-full object-cover" alt="Radiant" />
                                        </div>
                                        Radiant
                                    </div>
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-right min-w-[160px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {marketData.map(asset => {
                                const renderCell = (data?: { s: number, b: number }, isBest?: boolean) => {
                                    if (!data) return <span className="text-muted-foreground/20">-</span>;
                                    const showBest = isBest && data.s >= 0.01; // Only show if APY >= 0.01%
                                    return (
                                        <div className="flex flex-col items-center relative">
                                            {showBest && (
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500/20 text-yellow-500 text-[9px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/50 whitespace-nowrap shadow-[0_0_10px_rgba(234,179,8,0.3)] animate-pulse">
                                                    🏆 Best Vibe
                                                </div>
                                            )}
                                            <span className={`font-bold font-mono text-xs ${showBest ? 'text-yellow-400 scale-110 transition-transform' : 'text-emerald-400'}`}>
                                                +{data.s.toFixed(2)}%
                                            </span>
                                            <span className="text-red-400/80 font-mono text-[10px]">
                                                {data.b > 0 ? `-${data.b.toFixed(2)}%` : '0.00%'}
                                            </span>
                                        </div>
                                    );
                                };

                                return (
                                    <tr key={asset.symbol} className={`border-b border-border transition-colors hover:bg-muted/50 group ${asset.maxAPY === marketData[0].maxAPY && sortBy === 'apy' ? 'bg-yellow-500/5' : ''}`}>
                                        <td className="p-4 align-middle font-bold flex items-center gap-3">
                                            <AssetIcon symbol={asset.symbol} size={40} />
                                            <div className="flex flex-col">
                                                <span className="text-foreground text-base">{asset.symbol}</span>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1">
                                                    <span>BNB Chain</span>
                                                    <span className="w-1 h-1 rounded-full bg-border"></span>
                                                    <span className="text-emerald-500/80">Supplied: {formatMoney(asset.totalSupplied)}</span>
                                                    <span className="w-1 h-1 rounded-full bg-border"></span>
                                                    <span className="text-red-500/60">Borrowed: {formatMoney(asset.totalBorrowed)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-center border-l border-border bg-muted/20 group-hover:bg-transparent transition-colors">
                                            {renderCell(asset.venus, asset.maxAPY === asset.venus?.s)}
                                        </td>
                                        <td className="p-4 align-middle text-center border-l border-border bg-muted/20 group-hover:bg-transparent transition-colors">
                                            {renderCell(asset.kinza, asset.maxAPY === asset.kinza?.s)}
                                        </td>
                                        <td className="p-4 align-middle text-center border-l border-border bg-muted/20 group-hover:bg-transparent transition-colors">
                                            {renderCell(asset.radiant, asset.maxAPY === asset.radiant?.s)}
                                        </td>
                                        <td className="p-4 align-middle text-right border-l border-border">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/market/${asset.symbol}?tab=lend`}>
                                                    <Button size="sm" className="h-8 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all text-xs font-bold">
                                                        Lend
                                                    </Button>
                                                </Link>
                                                <Link href={`/market/${asset.symbol}?tab=borrow`}>
                                                    <Button size="sm" className="h-8 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white hover:border-destructive transition-all text-xs font-bold">
                                                        Borrow
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {marketData.length === 0 && <div className="p-8 text-center text-muted-foreground">No matching assets found.</div>}
                </div>
            </CardContent>
        </Card>
    );
}
