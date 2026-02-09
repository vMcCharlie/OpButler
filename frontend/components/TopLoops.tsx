'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssetIcon } from "@/components/ui/asset-icon";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Loader2, Shield, ShieldCheck } from 'lucide-react';

// ... (existing code)

{
    showFilters && (
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10 flex-wrap">
            {[
                { key: 'all', label: 'All', icon: null },
                { key: 'stable', label: 'Stable', icon: Shield },
                { key: 'safe', label: 'Safe', icon: ShieldCheck },
                { key: 'venus', label: 'Venus', icon: null },
                { key: 'kinza', label: 'Kinza', icon: null },
                { key: 'radiant', label: 'Radiant', icon: null },
            ].map(f => (
                <button
                    key={f.key}
                    onClick={() => setFilter(f.key as FilterType)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${filter === f.key
                        ? 'bg-[#CEFF00] text-black shadow-lg'
                        : 'text-muted-foreground hover:text-white'
                        }`}
                >
                    {f.icon && <f.icon size={14} className={filter === f.key ? "text-black" : "text-current"} />}
                    {f.label}
                </button>
            ))}
        </div>
    )
}
            </div >

    {/* Grid */ }
    < div className = {`grid gap-4 ${compact
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        : 'md:grid-cols-2 lg:grid-cols-4 gap-6'
        }`}>
        {
            displayLoops.map((loop) => (
                <div
                    key={loop.id}
                    onClick={() => handleMultiply(loop)}
                    className={`group relative bg-[#121216] border border-white/10 hover:border-[#CEFF00]/50 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#CEFF00]/10 cursor-pointer overflow-hidden ${compact ? 'p-3 hover:bg-[#CEFF00]/5' : 'p-5 hover:-translate-y-1'
                        }`}
                >
                    {!compact && (
                        <div className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5`}>
                            {loop.protocolDisplay}
                        </div>
                    )}

                    {compact ? (
                        // Compact Layout - Single Row / Denser
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {/* Overlapping Icons */}
                                <div className="flex items-center">
                                    <div className="relative z-10">
                                        <AssetIcon
                                            symbol={loop.supplyAsset}
                                            size={24}
                                            className="border-2 border-[#121216] rounded-full bg-[#121216]"
                                        />
                                    </div>
                                    <div className="relative -ml-3 z-0">
                                        <AssetIcon
                                            symbol={loop.borrowAsset}
                                            size={24}
                                            className="border-2 border-[#121216] rounded-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-sm leading-none group-hover:text-[#CEFF00] transition-colors">
                                            {loop.pair}
                                        </h3>
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded bg-white/5 text-muted-foreground border-none">
                                            {loop.protocolDisplay}
                                        </Badge>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Max {loop.maxLeverage}x
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-bold font-mono text-[#CEFF00] text-lg leading-none">
                                    +{loop.leveragedApy}%
                                </div>
                                <div className={`text-[9px] mt-0.5 ${loop.risk === 'Low' ? 'text-emerald-400' : loop.risk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                                    {loop.risk} Risk
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Standard Layout
                        <>
                            {/* Pair Icons */}
                            <div className="flex items-center mb-3">
                                <div className="relative z-10">
                                    <AssetIcon
                                        symbol={loop.supplyAsset}
                                        size={40}
                                        className="border-2 border-[#121216] rounded-full bg-[#121216]"
                                    />
                                </div>
                                <div className="relative -ml-2 z-0">
                                    <AssetIcon
                                        symbol={loop.borrowAsset}
                                        size={40}
                                        className="border-2 border-[#121216] rounded-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Pair Name */}
                            <h3 className="font-bold text-white group-hover:text-[#CEFF00] transition-colors text-lg mb-1">
                                {loop.pair} Loop
                            </h3>

                            {/* Badges */}
                            <div className="flex gap-1 flex-wrap mb-3">
                                <Badge
                                    variant="secondary"
                                    className={`text-[9px] border-none ${loop.risk === 'Low'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : loop.risk === 'Medium'
                                            ? 'bg-amber-500/10 text-amber-400'
                                            : 'bg-red-500/10 text-red-400'
                                        }`}
                                >
                                    {loop.risk} Risk
                                </Badge>
                                {loop.isStable && (
                                    <Badge variant="secondary" className="text-[9px] bg-blue-500/10 text-blue-400 border-none">
                                        Stable
                                    </Badge>
                                )}
                            </div>

                            {/* APY */}
                            <div className="border-t border-white/5 pt-4 mt-4">
                                <div className="text-[10px] text-muted-foreground mb-0.5">
                                    Max {loop.maxLeverage}x Leverage
                                </div>
                                <div className="font-bold font-mono text-[#CEFF00] text-3xl">
                                    +{loop.leveragedApy}%
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    Supply: {loop.supplyApy.toFixed(1)}% | Borrow: {loop.borrowApy.toFixed(1)}%
                                </div>
                            </div>

                            {/* Button */}
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card click
                                    handleMultiply(loop);
                                }}
                                className="w-full bg-white/5 hover:bg-[#CEFF00] hover:text-black text-white font-bold border border-white/10 hover:border-[#CEFF00] transition-all mt-4"
                            >
                                Multiply <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            ))
        }
            </div >

{
    displayLoops.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
            No loops found for this filter. Try a different selection.
        </div>
    )
}
        </div >
    );
}
