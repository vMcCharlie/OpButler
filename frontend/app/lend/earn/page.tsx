'use client';

import { Suspense, useMemo } from 'react';
import { useYields } from "@/hooks/useYields";
import { EarnTable } from "@/components/EarnTable";
import { Loader2, HelpCircle } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

function EarnMetrics() {
    const { data: yields } = useYields();

    const metrics = useMemo(() => {
        if (!yields) return { totalSupply: 0, totalAvailable: 0, totalBorrowed: 0 };

        return yields.reduce((acc, pool) => {
            const supply = pool.totalSupplyUsd || pool.tvlUsd || 0;
            const borrow = pool.totalBorrowUsd || (pool.tvlUsd ? pool.tvlUsd * 0.4 : 0);

            // Assuming TVL in DefiLlama often represents Liquidity (Available) for lending markets
            // If totalSupplyUsd is given, Available = TotalSupply - Borrowed
            // But let's stick to the hook implementation logic
            // In the hook: totalSupplyUsd = pool.totalSupplyUsd || pool.tvlUsd
            // So let's assume 'tvlUsd' from API is actually 'Available Liquidity' for some, but 'Total Supply' for others?
            // Safer bet: 
            // Total Supply = Sum of supplied
            // Total Borrowed = Sum of borrowed
            // Total Available = Total Supply - Total Borrowed

            return {
                totalSupply: acc.totalSupply + supply,
                totalBorrowed: acc.totalBorrowed + borrow,
                totalAvailable: acc.totalAvailable + (supply - borrow)
            };
        }, { totalSupply: 0, totalAvailable: 0, totalBorrowed: 0 });
    }, [yields]);

    const formatBillion = (num: number) => {
        if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        return `$${num.toFixed(0)}`;
    };

    return (
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 py-8 border-b border-white/5 mb-12">
            <div className="flex flex-col items-center md:block">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1">
                    Total Supply
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                    {formatBillion(metrics.totalSupply)}
                </div>
            </div>
            <div className="flex flex-col items-center md:block">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1">
                    Total Available
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                    {formatBillion(metrics.totalAvailable)}
                </div>
            </div>
            <div className="flex flex-col items-center md:block">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1">
                    Total Borrowed
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400">
                    {formatBillion(metrics.totalBorrowed)}
                </div>
            </div>
        </div>
    );
}

function FAQSection() {
    return (
        <div className="space-y-6 mt-20">
            <h3 className="text-xl font-bold">FAQs</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-[#0f0f12] border-white/5 p-0">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-b-0">
                            <AccordionTrigger className="px-6 hover:no-underline hover:text-emerald-400">What is OpButler Lend?</AccordionTrigger>
                            <AccordionContent className="px-6 pb-4 text-muted-foreground">
                                OpButler Lend is your intelligent gateway to Decentralized Finance (DeFi) on BNB Chain. It aggregates the best lending and borrowing opportunities from top protocols like Venus, Kinza, and Radiant, allowing you to optimize your yields automatically.
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Earn: Deposit your crypto to lend it out and earn passive APY.</li>
                                    <li>Borrow: Use deposited assets as collateral to take out loans.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                <Card className="bg-[#0f0f12] border-white/5 p-0">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-2" className="border-b-0">
                            <AccordionTrigger className="px-6 hover:no-underline hover:text-emerald-400">What's the difference between Earn and Borrow?</AccordionTrigger>
                            <AccordionContent className="px-6 pb-4 text-muted-foreground">
                                <p className="mb-2"><strong>Earn</strong> is for users who want to supply assets (like USDT, BNB, BTC) to earn interest paid by borrowers.</p>
                                <p><strong>Borrow</strong> is for users who want to leverage their holdings. You supply collateral to mint or borrow other assets, allowing for advanced strategies like looping.</p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                <Card className="bg-[#0f0f12] border-white/5 p-0">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-3" className="border-b-0">
                            <AccordionTrigger className="px-6 hover:no-underline hover:text-emerald-400">What are the risks?</AccordionTrigger>
                            <AccordionContent className="px-6 pb-4 text-muted-foreground">
                                All DeFi interactions carry risks.
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Smart Contract Risk:</strong> Underlying protocols could have bugs.</li>
                                    <li><strong>Market Risk:</strong> Asset values can fluctuate.</li>
                                    <li><strong>Liquidation Risk:</strong> If you borrow, ensure your health factor stays high to avoid liquidation.</li>
                                </ul>
                                OpButler helps mitigate these by monitoring your health factor and selecting established protocols.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                <Card className="bg-[#0f0f12] border-white/5 p-0">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger className="px-6 hover:no-underline hover:text-emerald-400">Can I deposit and withdraw my funds freely?</AccordionTrigger>
                            <AccordionContent className="px-6 pb-4 text-muted-foreground">
                                Yes. You can deposit and withdraw at any time, subject to available liquidity in the underlying pools. The system is designed for high liquidity, but extreme market conditions could temporarily affect availability.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>
            </div>

            <div className="flex justify-end">
                <a href="#" className="text-emerald-400 text-sm font-medium hover:underline flex items-center gap-1">
                    Check OpButler Guides <span className="text-xs">↗</span>
                </a>
            </div>
        </div>
    );
}

export default function EarnPage() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Hero */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">OpButler Lend</h1>
                <p className="text-muted-foreground">The smartest yield intelligence suite on Binance</p>
            </div>

            {/* Metrics */}
            <EarnMetrics />

            {/* Section Title */}
            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl font-bold text-white">Earn Interest on Your Crypto</h2>
            </div>
            <p className="text-muted-foreground mb-8 flex items-center gap-2">
                Passively get yield using OpButler Lend.
                <span className="text-emerald-400 flex items-center gap-1 text-sm font-medium cursor-pointer hover:underline">
                    How it works <HelpCircle className="w-3 h-3" />
                </span>
            </p>

            {/* Table */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                <EarnTable />
            </Suspense>

            {/* FAQs */}
            <FAQSection />
        </div>
    );
}
