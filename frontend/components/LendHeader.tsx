'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useYields } from "@/hooks/useYields";
import { motion, useSpring, useInView, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils'; // Assuming cn exists, else remove
import Image from 'next/image'; // If we want to add an icon or logo similar to the Jupiter reference

function Counter({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
    const isInView = useInView(ref, { once: true, margin: "-10px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [motionValue, isInView, value]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
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
    }, [springValue, prefix, suffix]);

    return <span ref={ref} />;
}

export function LendHeader() {
    const { data: yields } = useYields();

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
        <div className="relative w-full rounded-3xl p-[1px] bg-gradient-to-r from-[#CEFF00]/40 via-blue-500/40 to-[#CEFF00]/40 mb-8 overflow-hidden font-outfit">
            <div className="relative w-full h-full rounded-3xl bg-[#13131a] p-6 md:p-8 overflow-hidden">
                {/* Background Gradient/Glow */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[#CEFF00]/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Logo/Icon + Title Row */}
                    <div className="flex items-center gap-4 mb-2">
                        <div className="relative w-10 h-10 md:w-12 md:h-12">
                            <Image src="/OpButler.png" alt="OpButler" fill className="object-contain" />
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            <span className="text-white">OpButler</span> <span className="text-[#CEFF00]">Lend</span>
                        </h1>
                    </div>

                    <p className="text-muted-foreground text-[16px] max-w-md mb-6">
                        The smartest yield intelligence suite on Binance
                    </p>

                    {/* Divider */}
                    <div className="w-full max-w-lg h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 w-full max-w-3xl">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Supply</span>
                            <div className="text-xl md:text-2xl font-bold text-white">
                                <Counter value={metrics.totalSupply} prefix="$" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center relative">
                            {/* Mobile Divider */}
                            <div className="md:hidden absolute top-0 w-8 h-[1px] bg-white/10 -mt-3" />

                            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Available</span>
                            <div className="text-xl md:text-2xl font-bold text-emerald-400">
                                <Counter value={metrics.totalAvailable} prefix="$" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center relative">
                            {/* Mobile Divider */}
                            <div className="md:hidden absolute top-0 w-8 h-[1px] bg-white/10 -mt-3" />

                            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Borrowed</span>
                            <div className="text-xl md:text-2xl font-bold text-blue-400">
                                <Counter value={metrics.totalBorrowed} prefix="$" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
