'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssetIcon } from "@/components/ui/asset-icon";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useSmartLoops, SmartLoop } from '@/hooks/useSmartLoops';

type FilterType = 'all' | 'stable' | 'safe' | 'venus' | 'kinza' | 'radiant';

interface TopLoopsProps {
    compact?: boolean;
    maxItems?: number;
    showFilters?: boolean;
}

export function TopLoops({ compact = false, maxItems = 5, showFilters = true }: TopLoopsProps) {
    const router = useRouter();
    const { loops, isLoading, getTopLoops, getStableLoops, getSafeLoops, getByProtocol } = useSmartLoops();
    const [filter, setFilter] = useState<FilterType>('all');

    // Apply filters
    let filteredLoops: SmartLoop[] = [];
    switch (filter) {
        case 'stable':
            filteredLoops = getStableLoops();
            break;
        case 'safe':
            filteredLoops = getSafeLoops();
            break;
        case 'venus':
            filteredLoops = getByProtocol('venus');
            break;
        case 'kinza':
            filteredLoops = getByProtocol('kinza');
            break;
        case 'radiant':
            filteredLoops = getByProtocol('radiant');
            break;
        default:
            filteredLoops = getTopLoops(maxItems);
    }

    // Limit displayed items
    const displayLoops = filteredLoops.slice(0, maxItems);

    const handleMultiply = (loop: SmartLoop) => {
        // Navigate with params and hash for auto-scroll
        router.push(`/strategy?supply=${loop.supplyAsset}&borrow=${loop.borrowAsset}&protocol=${loop.protocol}#strategy-builder`);
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Calculating optimal loops...</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className={`flex items-center justify-between ${compact ? 'mb-4' : 'mb-8'}`}>
                <div className="flex items-center gap-3">
                    <h2 className={`font-bold text-white font-outfit ${compact ? 'text-xl' : 'text-3xl'}`}>
                        {compact ? 'Suggested Loops' : 'Top Loops'}
                    </h2>
                    <Flame className={`text-orange-500 animate-pulse ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </div>

                {showFilters && (
                    <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10 flex-wrap">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'stable', label: '🛡️ Stable' },
                            { key: 'safe', label: '✅ Safe' },
                            { key: 'venus', label: 'Venus' },
                            { key: 'kinza', label: 'Kinza' },
                            { key: 'radiant', label: 'Radiant' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key as FilterType)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === f.key
                                    ? 'bg-[#CEFF00] text-black shadow-lg'
                                    : 'text-muted-foreground hover:text-white'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className={`grid gap-4 ${compact
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
                : 'md:grid-cols-2 lg:grid-cols-4 gap-6'
                }`}>
                {displayLoops.map((loop) => (
                    <div
                        key={loop.id}
                        className={`group relative bg-[#121216] border border-white/10 hover:border-[#CEFF00]/50 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#CEFF00]/10 ${compact ? 'p-3' : 'p-5'
                            }`}
                    >
                        {/* Protocol Badge */}
                        <div className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5`}>
                            {loop.protocolDisplay}
                        </div>

                        {/* Pair Icons */}
                        <div className="flex items-center mb-3">
                            <div className="relative z-10">
                                <AssetIcon
                                    symbol={loop.supplyAsset}
                                    size={compact ? 28 : 40}
                                    className="border-2 border-[#121216] rounded-full bg-[#121216]"
                                />
                            </div>
                            <div className="relative -ml-2 z-0">
                                <AssetIcon
                                    symbol={loop.borrowAsset}
                                    size={compact ? 28 : 40}
                                    className="border-2 border-[#121216] rounded-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                />
                            </div>
                        </div>

                        {/* Pair Name */}
                        <h3 className={`font-bold text-white group-hover:text-[#CEFF00] transition-colors ${compact ? 'text-sm mb-1' : 'text-lg mb-1'
                            }`}>
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
                        <div className={`border-t border-white/5 ${compact ? 'pt-2 mt-2' : 'pt-4 mt-4'}`}>
                            <div className="text-[10px] text-muted-foreground mb-0.5">
                                {compact ? `${loop.maxLeverage}x Lev.` : `Max ${loop.maxLeverage}x Leverage`}
                            </div>
                            <div className={`font-bold font-mono text-[#CEFF00] ${compact ? 'text-xl' : 'text-3xl'}`}>
                                +{loop.leveragedApy}%
                            </div>
                            {!compact && (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    Supply: {loop.supplyApy.toFixed(1)}% | Borrow: {loop.borrowApy.toFixed(1)}%
                                </div>
                            )}
                        </div>

                        {/* Button */}
                        <Button
                            onClick={() => handleMultiply(loop)}
                            className={`w-full bg-white/5 hover:bg-[#CEFF00] hover:text-black text-white font-bold border border-white/10 hover:border-[#CEFF00] transition-all ${compact ? 'mt-2 h-8 text-xs' : 'mt-4'
                                }`}
                        >
                            Multiply <ArrowRight className={compact ? 'ml-1 w-3 h-3' : 'ml-2 w-4 h-4'} />
                        </Button>
                    </div>
                ))}
            </div>

            {displayLoops.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No loops found for this filter. Try a different selection.
                </div>
            )}
        </div>
    );
}
