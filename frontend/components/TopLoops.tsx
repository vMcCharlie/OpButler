'use client';

import { useState } from 'react';
import { AssetIcon } from "@/components/ui/asset-icon";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface Strategy {
    id: string;
    pair: string;
    protocol: 'Venus' | 'Kinza' | 'Radiant';
    maxApy: number;
    collateral: string;
    debt: string;
    risk: 'Low' | 'Medium' | 'High';
    isStable: boolean;
}

const TOP_LOOPS: Strategy[] = [
    { id: '1', pair: 'USDT / USDT', protocol: 'Venus', maxApy: 14.2, collateral: 'USDT', debt: 'USDT', risk: 'Low', isStable: true },
    { id: '2', pair: 'USDC / USDT', protocol: 'Radiant', maxApy: 18.5, collateral: 'USDC', debt: 'USDT', risk: 'Medium', isStable: true },
    { id: '3', pair: 'BNB / BNB', protocol: 'Kinza', maxApy: 8.4, collateral: 'BNB', debt: 'BNB', risk: 'Low', isStable: false },
    { id: '4', pair: 'ETH / USDC', protocol: 'Venus', maxApy: 11.2, collateral: 'ETH', debt: 'USDC', risk: 'High', isStable: false },
    { id: '5', pair: 'FDUSD / USDT', protocol: 'Kinza', maxApy: 16.8, collateral: 'FDUSD', debt: 'USDT', risk: 'Low', isStable: true },
];

export function TopLoops() {
    const [filterStable, setFilterStable] = useState(false);

    const filteredLoops = filterStable
        ? TOP_LOOPS.filter(s => s.isStable)
        : TOP_LOOPS;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-white font-outfit">Top Loops</h2>
                    <Flame className="text-orange-500 animate-pulse" />
                </div>

                <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                    <button
                        onClick={() => setFilterStable(false)}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${!filterStable ? 'bg-[#CEFF00] text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        All Loops
                    </button>
                    <button
                        onClick={() => setFilterStable(true)}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${filterStable ? 'bg-[#CEFF00] text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Stablecoins Only 🛡️
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredLoops.map((loop) => (
                    <div key={loop.id} className="group relative bg-[#121216] border border-white/10 hover:border-[#CEFF00]/50 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#CEFF00]/10">
                        {/* Protocol Badge */}
                        <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5">
                            {loop.protocol}
                        </div>

                        {/* Pair Icons */}
                        <div className="flex items-center mb-4">
                            <div className="relative z-10">
                                <AssetIcon symbol={loop.collateral} size={40} className="border-2 border-[#121216] rounded-full bg-[#121216]" />
                            </div>
                            <div className="relative -ml-3 z-0">
                                <AssetIcon symbol={loop.debt} size={40} className="border-2 border-[#121216] rounded-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                            </div>
                        </div>

                        {/* Pair Name */}
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#CEFF00] transition-colors">{loop.pair} Loop</h3>
                        <div className="flex gap-2 mb-4">
                            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-none">
                                {loop.risk} Risk
                            </Badge>
                            {loop.isStable && (
                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-none">
                                    Stable
                                </Badge>
                            )}
                        </div>

                        {/* APY */}
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-xs text-muted-foreground mb-1">Max Leverage APY</div>
                            <div className="text-3xl font-bold font-mono text-[#CEFF00]">+{loop.maxApy}%</div>
                        </div>

                        {/* Button */}
                        <Button className="w-full mt-4 bg-white/5 hover:bg-[#CEFF00] hover:text-black text-white font-bold border border-white/10 hover:border-[#CEFF00] transition-all">
                            Multiply <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
