'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useYields } from "@/hooks/useYields";
import { useAggregatedHealth } from "@/hooks/useAggregatedHealth";
import { motion, useMotionValue, useInView, animate } from 'framer-motion';
import { cn, formatMoney } from '@/lib/utils';
import Image from 'next/image';
import { Wallet, ShieldCheck, Zap } from 'lucide-react';

function Counter({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const isInView = useInView(ref, { once: true, margin: "-10px" });

    useEffect(() => {
        if (isInView) {
            animate(motionValue, value, {
                duration: 1.2, // Max 1.5s as requested
                ease: "easeOut"
            });
        }
    }, [motionValue, isInView, value]);

    useEffect(() => {
        return motionValue.on("change", (latest) => {
            if (ref.current) {
                // Formatting logic inside the animation frame
                let formatted = latest.toFixed(0);
                if (latest >= 1000000000) {
                    formatted = (latest / 1000000000).toFixed(2) + 'B';
                } else if (latest >= 1000000) {
                    formatted = (latest / 1000000).toFixed(2) + 'M';
                } else {
                    formatted = latest.toFixed(2); // For smaller numbers
                }

                // For very large numbers in the billions, we might just want 2 decimal places always if > 1B
                // The prompt example shows $1.69B, so let's stick to that compact format

                ref.current.textContent = `${prefix}${formatted}${suffix}`;
            }
        });
    }, [motionValue, prefix, suffix]);

    return <span ref={ref} />;
}

export function LendHeader() {
    const { data: yields } = useYields();
    const { totalBorrowPowerUSD, totalDebtUSD, venus, kinza, radiant, isLoading } = useAggregatedHealth();

    // The user wants a 5% safety margin: Max Safe = Power * 0.95
    const maxSafeBorrowPower = totalBorrowPowerUSD * 0.95;
    const utilization = maxSafeBorrowPower > 0 ? (totalDebtUSD / maxSafeBorrowPower) * 100 : 0;
    const isUtilizationHigh = utilization > 80;

    const metrics = useMemo(() => {
        if (!yields) return { totalSupply: 0, totalAvailable: 0, totalBorrowed: 0 };

        return yields.reduce((acc, pool) => {
            const supply = pool.totalSupplyUsd || pool.tvlUsd || 0;
            const borrow = pool.totalBorrowUsd || (pool.tvlUsd ? pool.tvlUsd * 0.4 : 0);

            return {
                totalSupply: acc.totalSupply + supply,
                totalBorrowed: acc.totalBorrowed + borrow,
                totalAvailable: acc.totalAvailable + (supply - borrow)
            };
        }, { totalSupply: 0, totalAvailable: 0, totalBorrowed: 0 });
    }, [yields]);

    return (
        <div className="relative w-full rounded-3xl p-[3px] bg-gradient-to-r from-[#CEFF00]/40 via-blue-500/40 to-[#CEFF00]/40 mb-8 overflow-hidden font-outfit">
            <div className="relative w-full h-full rounded-3xl bg-[#13131a] p-6 md:p-8 overflow-hidden">
                {/* Background Gradient/Glow */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[#CEFF00]/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center w-full">
                    {/* Logo/Icon + Title Row */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative w-8 h-8 md:w-12 md:h-12">
                            <Image src="/OpButler.png" alt="OpButler" fill className="object-contain" />
                        </div>

                        <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">
                            <span className="text-white">OpButler</span> <span className="text-[#CEFF00]">Lend</span>
                        </h1>
                    </div>

                    <p className="text-muted-foreground text-sm md:text-[16px] max-w-md mb-6 px-4">
                        The smartest yield intelligence suite on Binance
                    </p>

                    {/* Divider */}
                    <div className="w-full max-w-lg h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

                    {/* Metrics Grid - Adjusted for mobile */}
                    <div className="grid grid-cols-3 w-full max-w-3xl gap-1 md:gap-8 px-1 md:px-0">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 text-center whitespace-nowrap">
                                <span className="md:hidden">Supply</span>
                                <span className="hidden md:inline">Total Supply</span>
                            </span>
                            <div className="text-sm md:text-2xl font-bold text-white whitespace-nowrap">
                                <Counter value={metrics.totalSupply} prefix="$" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center relative border-l border-white/5 md:border-none pl-1 md:pl-0">
                            {/* Desktop Divider - Vertical line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-8 bg-white/10 -ml-4 hidden md:block" />

                            <span className="text-[9px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 text-center whitespace-nowrap">
                                <span className="md:hidden">Available</span>
                                <span className="hidden md:inline">Total Available</span>
                            </span>
                            <div className="text-sm md:text-2xl font-bold text-emerald-400 whitespace-nowrap">
                                <Counter value={metrics.totalAvailable} prefix="$" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center relative border-l border-white/5 md:border-none pl-1 md:pl-0">
                            {/* Desktop Divider - Vertical line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-8 bg-white/10 -ml-4 hidden md:block" />

                            <span className="text-[9px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 text-center whitespace-nowrap">
                                <span className="md:hidden">Borrowed</span>
                                <span className="hidden md:inline">Total Borrowed</span>
                            </span>
                            <div className="text-sm md:text-2xl font-bold text-blue-400 whitespace-nowrap">
                                <Counter value={metrics.totalBorrowed} prefix="$" />
                            </div>
                        </div>
                    </div>

                    {/* Utilization Bar */}
                    {!isLoading && totalBorrowPowerUSD > 0 && (
                        <div className="w-full max-w-2xl mt-8 px-4">
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex flex-col items-start text-xs font-bold uppercase tracking-wider">
                                    <span className="text-muted-foreground mb-1">Total Borrow Power</span>
                                    <span className="text-white text-lg">
                                        {formatMoney(maxSafeBorrowPower)}
                                        <span className="text-[10px] text-muted-foreground ml-1">(Safe Max)</span>
                                    </span>
                                </div>
                                <div className="flex flex-col items-end text-xs font-bold uppercase tracking-wider">
                                    <span className="text-muted-foreground mb-1">Utilization</span>
                                    <span className={cn("text-lg", isUtilizationHigh ? "text-red-400" : "text-[#CEFF00]")}>
                                        {utilization.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
                                <motion.div
                                    className={cn(
                                        "h-full rounded-full bg-gradient-to-r",
                                        isUtilizationHigh ? "from-red-500 to-orange-500" : "from-[#CEFF00] to-emerald-400"
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(utilization, 100)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>

                            <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground gap-4">
                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#F0B90B]" />
                                    <span>Venus: {formatMoney(venus.borrowPowerUSD * 0.95)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                    <span>Kinza: {formatMoney(kinza.borrowPowerUSD * 0.95)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
                                    <span>Radiant: {formatMoney(radiant.borrowPowerUSD * 0.95)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
